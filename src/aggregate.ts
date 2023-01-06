import { readonlyArray, task, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import type { TaskEither } from 'fp-ts/TaskEither';

export const withAggregatedErrors =
  <A, L, R>(fab: (a: A) => TaskEither<L, R>): ((a: A) => TaskEither<readonly L[], R>) =>
  (a) =>
    pipe(fab(a), taskEither.mapLeft(readonlyArray.of));

export const runWithAggregatedErrors = <L, R>(te: readonly TaskEither<readonly L[], R>[]) =>
  pipe(
    te,
    readonlyArray.sequence(
      taskEither.getApplicativeTaskValidation(task.ApplyPar, readonlyArray.getSemigroup<L>())
    )
  );
