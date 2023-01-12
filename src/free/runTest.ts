import { either, task, taskEither } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type { Task } from 'fp-ts/Task';
import type { TaskEither } from 'fp-ts/TaskEither';
import * as retry from 'retry-ts';
import { retrying } from 'retry-ts/lib/Task';
import { match } from 'ts-pattern';

import { assert } from '../pure/assert';
import type { SingleAssertionTest, TestRunError } from '../type';

const timedOutError = { error: 'timed out' } as const;

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

const runActualAndAssert = (param: {
  readonly actualTask: Task<unknown>;
  readonly expectedResult: unknown;
}) =>
  pipe(
    taskEither.tryCatch(param.actualTask, (exception) => ({
      error: 'unhandled exception' as const,
      exception,
    })),
    taskEither.chainEitherKW((actualResult) =>
      assert({ actual: actualResult, expected: param.expectedResult })
    )
  );

export const runTest = (test: SingleAssertionTest): TaskEither<TestRunError, undefined> =>
  pipe(
    runActualAndAssert({ actualTask: test.expect, expectedResult: test.toResult }),
    runWithTimeout({ timeout: test.timeout }),
    runWithRetry({ retry: test.retry })
  );
