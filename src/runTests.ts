import { boolean, either, readonlyArray, task, taskEither } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type { Task } from 'fp-ts/Task';
import type { TaskEither } from 'fp-ts/TaskEither';
import * as retry from 'retry-ts';
import { retrying } from 'retry-ts/lib/Task';
import { match } from 'ts-pattern';

import * as arrayTaskValidation from './arrayTaskValidation';
import { getDiffs } from './getDiffs';
import type {
  Assertion,
  AssertionError,
  Change,
  Concurrency,
  MultipleAssertionTest,
  Test,
  TestConfig,
  TestFailedResult,
} from './type';

const hasAnyChange = readonlyArray.foldMap(boolean.MonoidAll)((diff: Change) => diff.type === '0');

const assertionFailed =
  (result: { readonly expected: unknown; readonly actual: unknown }) =>
  (diff: readonly Change[]) => ({
    code: 'assertion failed' as const,
    diff,
    actual: result.actual,
    expected: result.expected,
  });

const assertEqual = (result: { readonly expected: unknown; readonly actual: unknown }) =>
  pipe(
    result,
    getDiffs,
    either.chainW(either.fromPredicate(hasAnyChange, assertionFailed(result))),
    either.map(() => undefined)
  );

const unhandledException = (exception: unknown) => ({
  code: 'unhandled exception' as const,
  exception,
});

const runActualAndAssert = (param: {
  readonly actualTask: Task<unknown>;
  readonly expectedResult: unknown;
}) =>
  pipe(
    taskEither.tryCatch(param.actualTask, unhandledException),
    taskEither.chainEitherKW((actual) => assertEqual({ actual, expected: param.expectedResult }))
  );

const runWithTimeout =
  (assertion: Pick<Assertion, 'shouldTimeout' | 'timeout'>) =>
  (te: TaskEither<AssertionError, undefined>): TaskEither<AssertionError, undefined> =>
    pipe(
      task
        .getRaceMonoid<Either<AssertionError, undefined>>()
        .concat(te, task.delay(assertion.timeout ?? 5000)(taskEither.left({ code: 'timed out' }))),
      task.map((e) =>
        assertion.shouldTimeout === true
          ? either.isLeft(e) && e.left.code === 'timed out'
            ? either.right(undefined)
            : either.left({ code: 'should be timed out' })
          : e
      )
    );

const runWithRetry =
  (test: Pick<Assertion, 'retry'>) =>
  <L, R>(te: TaskEither<L, R>) =>
    retrying(test.retry ?? retry.limitRetries(0), () => te, either.isLeft);

const runAssertion = (assertion: Assertion) =>
  pipe(
    runActualAndAssert({ actualTask: assertion.act, expectedResult: assertion.assert }),
    runWithTimeout({ timeout: assertion.timeout, shouldTimeout: assertion.shouldTimeout }),
    runWithRetry({ retry: assertion.retry }),
    taskEither.mapLeft((error) => ({ name: assertion.name, error })),
    arrayTaskValidation.lift
  );

const runWithConcurrency = (config: { readonly concurrency?: Concurrency }) =>
  match(config.concurrency)
    .with(undefined, () => readonlyArray.sequence(task.ApplicativePar))
    .with({ type: 'parallel' }, () => readonlyArray.sequence(task.ApplicativePar))
    .with({ type: 'sequential' }, () => readonlyArray.sequence(task.ApplicativeSeq))
    .exhaustive();

const runMultipleAssertion = (
  test: MultipleAssertionTest
): TaskEither<readonly TestFailedResult[], undefined> =>
  pipe(
    test.asserts,
    readonlyArray.map(runAssertion),
    runWithConcurrency({ concurrency: test.concurrency }),
    arrayTaskValidation.run,
    taskEither.bimap(
      readonlyArray.map(
        (error): TestFailedResult => ({
          ...error,
          name: `${test.name} > ${error.name}`,
        })
      ),
      () => undefined
    )
  );

const runTest = (test: Test): TaskEither<readonly TestFailedResult[], undefined> =>
  match(test)
    .with({ assertion: 'single' }, ({ assert }) => runAssertion(assert))
    .with({ assertion: 'multiple' }, runMultipleAssertion)
    .exhaustive();

export const runTests =
  (testsWithConfig: TestConfig) =>
  (tests: readonly Test[]): TaskEither<readonly TestFailedResult[], undefined> =>
    pipe(
      tests,
      readonlyArray.map(runTest),
      runWithConcurrency({ concurrency: testsWithConfig.concurrency }),
      arrayTaskValidation.run,
      taskEither.map(() => undefined)
    );
