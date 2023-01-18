import { boolean, either, readonlyArray, task, taskEither } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { identity, pipe } from 'fp-ts/function';
import type { Task } from 'fp-ts/Task';
import type { TaskEither } from 'fp-ts/TaskEither';
import * as std from 'fp-ts-std';
import * as retry from 'retry-ts';
import { retrying } from 'retry-ts/lib/Task';
import { match } from 'ts-pattern';

import { getDiffs } from './getDiffs';
import type {
  Assertion,
  Change,
  Concurrency,
  MultipleAssertionTest,
  Test,
  TestConfig,
  TestEitherResult,
  TestError,
  TestPassResult,
  TestsResult,
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
  (assertion: Pick<Assertion, 'timeout'>) => (te: TaskEither<TestError, unknown>) =>
    task
      .getRaceMonoid<Either<TestError, unknown>>()
      .concat(
        te,
        pipe({ code: 'timed out' as const }, taskEither.left, task.delay(assertion.timeout ?? 5000))
      );

const runWithRetry =
  (test: Pick<Assertion, 'retry'>) =>
  <L, R>(te: TaskEither<L, R>) =>
    retrying(test.retry ?? retry.limitRetries(0), () => te, either.isLeft);

const runAssertion = (assertion: Assertion): Task<TestsResult> =>
  pipe(
    runActualAndAssert({ actualTask: assertion.act, expectedResult: assertion.assert }),
    runWithTimeout({ timeout: assertion.timeout }),
    runWithRetry({ retry: assertion.retry }),
    taskEither.bimap(
      (error) => [either.left({ name: assertion.name, error })],
      () => [{ name: assertion.name }]
    )
  );

const runWithConcurrency = (config: { readonly concurrency?: Concurrency }) =>
  match(config.concurrency)
    .with(undefined, () => readonlyArray.sequence(task.ApplicativePar))
    .with({ type: 'parallel' }, () => readonlyArray.sequence(task.ApplicativePar))
    .with({ type: 'sequential' }, () => readonlyArray.sequence(task.ApplicativeSeq))
    .exhaustive();

const foldTestResult = (r: readonly TestsResult[]): TestsResult =>
  pipe(
    r,
    readonlyArray.reduce(
      either.right<readonly TestEitherResult[], readonly TestPassResult[]>([]),
      (acc, el) =>
        pipe(
          acc,
          either.chain(
            (accr): TestsResult =>
              pipe(
                el,
                either.bimap(
                  (ell) =>
                    pipe(accr, readonlyArray.map(either.right), (accra) => [...accra, ...ell]),
                  (elr) => [...accr, ...elr]
                )
              )
          ),
          either.mapLeft((accl): readonly TestEitherResult[] =>
            pipe(el, either.match(identity, readonlyArray.map(either.right)), (newAcc) => [
              ...accl,
              ...newAcc,
            ])
          )
        )
    )
  );

const prependName =
  (name: string) =>
  <K extends { readonly name: string }>(k: K): K => ({
    ...k,
    name: std.string.prepend(`${name} > `),
  });

const runMultipleAssertion = (test: MultipleAssertionTest): Task<TestsResult> =>
  pipe(
    test.asserts,
    readonlyArray.map(runAssertion),
    runWithConcurrency({ concurrency: test.concurrency }),
    task.map(foldTestResult),
    taskEither.bimap(
      readonlyArray.map(either.bimap(prependName(test.name), prependName(test.name))),
      readonlyArray.map(prependName(test.name))
    )
  );

const runTest = (test: Test): Task<TestsResult> =>
  match(test)
    .with({ assertion: 'single' }, ({ assert }) => runAssertion(assert))
    .with({ assertion: 'multiple' }, runMultipleAssertion)
    .exhaustive();

export const runTests =
  (testsWithConfig: TestConfig) =>
  (tests: readonly Test[]): Task<TestsResult> =>
    pipe(
      tests,
      readonlyArray.map(runTest),
      runWithConcurrency({ concurrency: testsWithConfig.concurrency }),
      task.map(foldTestResult)
    );
