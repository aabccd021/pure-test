import { either, task, taskEither } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { identity, pipe } from 'fp-ts/function';
import type { Task } from 'fp-ts/Task';
import type { TaskEither } from 'fp-ts/TaskEither';
import type { RetryPolicy } from 'retry-ts';
import { retrying } from 'retry-ts/lib/Task';

import { serializeError } from '../_internal/libs/serializeError';
import type { Test, TestResult } from '../type';
import { TestError } from '../type';
import { assertEqual } from './assertEqual';

const runWithTimeout =
  <L, T>(timeoutMs: number) =>
  (te: TaskEither<L, T>) =>
    task
      .getRaceMonoid<Either<L | TestError, T>>()
      .concat(te, task.delay(timeoutMs)(taskEither.left(TestError.as.TimedOut({}))));

const runWithRetry =
  (retryPolicy: RetryPolicy) =>
  <L, R>(te: TaskEither<L, R>) =>
    retrying(retryPolicy, () => te, either.isLeft);

const serializeUnhandledException: <R>(te: TaskEither<unknown, R>) => TaskEither<TestError, R> =
  taskEither.orElseW((exception) =>
    pipe(
      exception,
      serializeError,
      task.map((serialized) =>
        either.left(
          TestError.as.UnhandledException({ exception: { value: exception, serialized } })
        )
      )
    )
  );

type TimeElapsed<T> = { readonly timeElapsedMs: number; readonly result: T };

const runWithTimeElapsed =
  <L, R>(te: TaskEither<L, R>): TaskEither<L, TimeElapsed<R>> =>
  async () => {
    const start = performance.now();
    const resultE = await te();
    const timeElapsedMs = performance.now() - start;
    return pipe(
      resultE,
      either.map((result) => ({ timeElapsedMs, result }))
    );
  };

const timeElapsedTEChainEitherKW = <L1, L2, R1, R2>(
  run: (t: R1) => Either<L2, R2>
): ((te: TaskEither<L1, TimeElapsed<R1>>) => TaskEither<L1 | L2, TimeElapsed<R2>>) =>
  taskEither.chainEitherKW(({ timeElapsedMs, result: oldResult }) =>
    pipe(
      oldResult,
      run,
      either.map((result) => ({ timeElapsedMs, result }))
    )
  );

export const runTest = (test: Test): Task<TestResult> =>
  pipe(
    taskEither.tryCatch(test.act, identity),
    serializeUnhandledException,
    runWithTimeElapsed,
    timeElapsedTEChainEitherKW(assertEqual),
    runWithTimeout(test.timeout),
    runWithRetry(test.retry),
    taskEither.map(({ timeElapsedMs }) => ({ timeElapsedMs }))
  );
