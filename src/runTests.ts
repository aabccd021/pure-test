import { boolean, either, readonlyArray, task, taskEither } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { flow, pipe } from 'fp-ts/function';
import type { Task } from 'fp-ts/Task';
import type { TaskEither } from 'fp-ts/TaskEither';
import * as retry from 'retry-ts';
import { retrying } from 'retry-ts/lib/Task';
import { match } from 'ts-pattern';

import { getDiffs } from './getDiffs';
import type {
  Assertion,
  AssertionError,
  AssertionResult,
  Change,
  MultipleAssertionTest,
  Test,
  TestConfig,
  TestResult,
} from './type';

const hasAnyChange = readonlyArray.foldMap(boolean.MonoidAll)((diff: Change) => diff.type === '0');

const assertionFailed =
  (result: { readonly expected: unknown; readonly actual: unknown }) =>
  (diff: readonly Change[]) => ({
    code: 'AssertionError' as const,
    diff,
    actual: result.actual,
    expected: result.expected,
  });

const assertEqual = (result: { readonly expected: unknown; readonly actual: unknown }) =>
  pipe(
    result,
    getDiffs,
    either.chainW(either.fromPredicate(hasAnyChange, assertionFailed(result)))
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
  (assertion: Pick<Assertion, 'timeout'>) => (te: TaskEither<AssertionError, unknown>) =>
    task
      .getRaceMonoid<Either<AssertionError, unknown>>()
      .concat(
        te,
        pipe({ code: 'timed out' as const }, taskEither.left, task.delay(assertion.timeout ?? 5000))
      );

const runWithRetry =
  (test: Pick<Assertion, 'retry'>) =>
  <L, R>(te: TaskEither<L, R>) =>
    retrying(test.retry ?? retry.limitRetries(0), () => te, either.isLeft);

const runAssertion = (assertion: Assertion): Task<AssertionResult> =>
  pipe(
    runActualAndAssert({ actualTask: assertion.act, expectedResult: assertion.assert }),
    runWithTimeout({ timeout: assertion.timeout }),
    runWithRetry({ retry: assertion.retry }),
    taskEither.bimap(
      (error) => ({ name: assertion.name, error }),
      () => ({ name: assertion.name })
    )
  );

const runSequentialUntilFail =
  <T, L, R>(f: (t: T) => TaskEither<L, R>, afterFail: (t: T) => Either<L, R>) =>
  (ts: readonly T[]): Task<readonly Either<L, R>[]> =>
    pipe(
      ts,
      readonlyArray.reduce(
        taskEither.of<readonly Either<L, R>[], readonly Either<L, R>[]>([]),
        (acc, el) =>
          pipe(
            acc,
            taskEither.chain((accr) =>
              pipe(
                el,
                f,
                taskEither.bimap(
                  (ell): readonly Either<L, R>[] => [...accr, either.left(ell)],
                  (elr): readonly Either<L, R>[] => [...accr, either.right(elr)]
                )
              )
            ),
            taskEither.mapLeft(readonlyArray.append<Either<L, R>>(afterFail(el)))
          )
      ),
      taskEither.toUnion
    );

const runAssertionsSequential = runSequentialUntilFail(runAssertion, (assertion) =>
  either.left({ name: assertion.name, error: { code: 'Skipped' as const } })
);

export const runAssertions = (
  config: Pick<MultipleAssertionTest, 'concurrency'>
): ((tests: readonly Assertion[]) => Task<readonly AssertionResult[]>) =>
  match(config.concurrency)
    .with(undefined, () => readonlyArray.traverse(task.ApplicativePar)(runAssertion))
    .with({ type: 'parallel' }, () => readonlyArray.traverse(task.ApplicativePar)(runAssertion))
    .with({ type: 'sequentialAll' }, () =>
      readonlyArray.traverse(task.ApplicativeSeq)(runAssertion)
    )
    .with({ type: 'sequential' }, () => runAssertionsSequential)
    .exhaustive();

const runMultipleAssertion = (test: MultipleAssertionTest): Task<TestResult> =>
  pipe(
    test.asserts,
    runAssertions({ concurrency: test.concurrency }),
    task.map(
      flow(
        readonlyArray.reduce(
          either.of<readonly AssertionResult[], readonly AssertionResult[]>([]),
          (acc, el) =>
            pipe(
              acc,
              either.chain((accr) =>
                pipe(
                  el,
                  either.bimap(
                    (ell): readonly AssertionResult[] => [...accr, either.left(ell)],
                    (elr): readonly AssertionResult[] => [...accr, either.right(elr)]
                  )
                )
              ),
              either.mapLeft(readonlyArray.append(el))
            )
        ),
        either.bimap(
          (results) => ({
            name: test.name,
            error: { code: 'MultipleAssertionError' as const, results },
          }),
          () => ({ name: test.name })
        )
      )
    )
  );

const runTest = (test: Test): Task<TestResult> =>
  match(test)
    .with({ assertion: 'single' }, ({ assert }) => runAssertion(assert))
    .with({ assertion: 'multiple' }, runMultipleAssertion)
    .exhaustive();

const getTestName = (test: Test): string =>
  match(test)
    .with({ assertion: 'single' }, ({ assert }) => assert.name)
    .with({ assertion: 'multiple' }, ({ name }) => name)
    .exhaustive();

const runTestsSequential = runSequentialUntilFail(runTest, (test) =>
  either.left({ name: getTestName(test), error: { code: 'Skipped' as const } })
);

export const runTests = (
  config: TestConfig
): ((tests: readonly Test[]) => Task<readonly TestResult[]>) =>
  match(config.concurrency)
    .with(undefined, () => readonlyArray.traverse(task.ApplicativePar)(runTest))
    .with({ type: 'parallel' }, () => readonlyArray.traverse(task.ApplicativePar)(runTest))
    .with({ type: 'sequentialAll' }, () => readonlyArray.traverse(task.ApplicativeSeq)(runTest))
    .with({ type: 'sequential' }, () => runTestsSequential)
    .exhaustive();
