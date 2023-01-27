import { either, readonlyArray, task, taskEither } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type { Task } from 'fp-ts/Task';
import type { TaskEither } from 'fp-ts/TaskEither';

import { ConcurrencyConfig } from '../type';

const runSequentialFailFast =
  <T, L, R>(run: (t: T) => TaskEither<L, R>) =>
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
                run,
                taskEither.bimap(
                  (ell): readonly Either<L, R>[] => [...accr, either.left(ell)],
                  (elr): readonly Either<L, R>[] => [...accr, either.right(elr)]
                )
              )
            )
          )
      ),
      taskEither.toUnion
    );

const runSequential =
  <T, L, R>(run: (t: T) => TaskEither<L, R>) =>
  (config: { readonly failFast: boolean }): ((ts: readonly T[]) => Task<readonly Either<L, R>[]>) =>
    config.failFast ? runSequentialFailFast(run) : readonlyArray.traverse(task.ApplicativeSeq)(run);

export const runWithConcurrency = <T, L, R>({
  concurrency,
  run,
}: {
  readonly concurrency: ConcurrencyConfig;
  readonly run: (t: T) => TaskEither<L, R>;
}): ((ts: readonly T[]) => Task<readonly Either<L, R>[]>) =>
  pipe(
    concurrency,
    ConcurrencyConfig.matchStrict({
      Parallel: () => readonlyArray.traverse(task.ApplicativePar)(run),
      Sequential: runSequential(run),
    })
  );
