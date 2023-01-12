import type { Change } from 'diff';
import { diffLines } from 'diff';
import { apply, boolean, either, readonlyArray, readonlyRecord, task, taskEither } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type { Task } from 'fp-ts/Task';
import type { TaskEither } from 'fp-ts/TaskEither';
import * as retry from 'retry-ts';
import { retrying } from 'retry-ts/lib/Task';
import { match } from 'ts-pattern';

import * as arrayTaskValidation from './arrayTaskValidation';
import type { SingleAssertionTest, TestFailedResult, TestsWithConfig } from './type';

const hasAnyChange = readonlyArray.foldMap(boolean.MonoidAll)(
  (change: Change) => change.added !== true && change.removed !== true
);

const assertionFailed = (diffs: readonly Change[]) => ({
  code: 'assertion failed' as const,
  diffs,
});

const stringifyFailed = (details: unknown) => ({ code: 'stringify failed' as const, details });

const stringify = (obj: unknown) =>
  either.tryCatch(() => JSON.stringify(obj, undefined, 2), stringifyFailed);

const assert = (results: { readonly expected: unknown; readonly actual: unknown }) =>
  pipe(
    results,
    readonlyRecord.map(stringify),
    apply.sequenceS(either.Apply),
    either.map(({ expected, actual }) => diffLines(expected, actual)),
    either.chainW(either.fromPredicate(hasAnyChange, assertionFailed)),
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

const getRetryPolicy = (test: Pick<SingleAssertionTest, 'retry'>) =>
  match(test.retry)
    .with(undefined, () => retry.limitRetries(0))
    .with({ type: 'count' }, ({ count }) => retry.limitRetries(count))
    .with({ type: 'policy' }, ({ policy }) => policy)
    .exhaustive();

const runWithRetry =
  (test: Pick<SingleAssertionTest, 'retry'>) =>
  <L, R>(te: TaskEither<L, R>) =>
    retrying(getRetryPolicy({ retry: test.retry }), () => te, either.isLeft);

const runTest = (test: SingleAssertionTest) =>
  pipe(
    runActualAndAssert({ actualTask: test.expect, expectedResult: test.toResult }),
    runWithTimeout({ timeout: test.timeout }),
    runWithRetry({ retry: test.retry }),
    taskEither.mapLeft((error) => ({ name: test.name, error })),
    arrayTaskValidation.lift
  );

const runWithConcurrency = (config: Pick<TestsWithConfig, 'concurrency'>) =>
  match(config.concurrency)
    .with(undefined, () => readonlyArray.sequence(task.ApplicativePar))
    .with({ type: 'parallel' }, () => readonlyArray.sequence(task.ApplicativePar))
    .with({ type: 'sequential' }, () => readonlyArray.sequence(task.ApplicativeSeq))
    .exhaustive();

export const runTests = (
  testsWithConfig: TestsWithConfig
): TaskEither<readonly TestFailedResult[], undefined> =>
  pipe(
    testsWithConfig.tests,
    readonlyArray.map(runTest),
    runWithConcurrency({ concurrency: testsWithConfig.concurrency }),
    arrayTaskValidation.run,
    taskEither.map(() => undefined)
  );
