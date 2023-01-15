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
import type { Change, SingleAssertionTest, Test, TestConfig, TestFailedResult } from './type';

const hasAnyChange = readonlyArray.foldMap(boolean.MonoidAll)((diff: Change) => diff.type === '0');

const assertionFailed =
  (result: { readonly expected: unknown; readonly actual: unknown }) =>
  (diff: readonly Change[]) => ({
    code: 'assertion failed' as const,
    diff,
    actual: result.actual,
    expected: result.expected,
  });

const assert = (result: { readonly expected: unknown; readonly actual: unknown }) =>
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
    taskEither.chainEitherKW((actual) => assert({ actual, expected: param.expectedResult }))
  );

const timedOutError = { code: 'timed out' } as const;

const runWithTimeout =
  (test: Pick<SingleAssertionTest, 'timeout'>) =>
  <L, R>(te: TaskEither<L, R>) =>
    task
      .getRaceMonoid<Either<L | typeof timedOutError, R>>()
      .concat(te, task.delay(test.timeout ?? 5000)(taskEither.left(timedOutError)));

const runWithRetry =
  (test: Pick<SingleAssertionTest, 'retry'>) =>
  <L, R>(te: TaskEither<L, R>) =>
    retrying(test.retry ?? retry.limitRetries(0), () => te, either.isLeft);

const runTest = (test: SingleAssertionTest) =>
  pipe(
    runActualAndAssert({ actualTask: test.expect, expectedResult: test.toResult }),
    runWithTimeout({ timeout: test.timeout }),
    runWithRetry({ retry: test.retry }),
    taskEither.mapLeft((error) => ({ name: test.name, error })),
    arrayTaskValidation.lift
  );

const runWithConcurrency = (config: Pick<TestConfig, 'concurrency'>) =>
  match(config.concurrency)
    .with(undefined, () => readonlyArray.sequence(task.ApplicativePar))
    .with({ type: 'parallel' }, () => readonlyArray.sequence(task.ApplicativePar))
    .with({ type: 'sequential' }, () => readonlyArray.sequence(task.ApplicativeSeq))
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
