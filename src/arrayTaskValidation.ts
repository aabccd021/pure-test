import { either, readonlyArray, task, taskEither } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type { Task } from 'fp-ts/Task';
import type { TaskEither } from 'fp-ts/TaskEither';

export const lift = <L, R>(te: TaskEither<L, R>) => pipe(te, taskEither.mapLeft(readonlyArray.of));

export const run = <L, R>(resultsTask: Task<readonly Either<readonly L[], R>[]>) =>
  pipe(
    resultsTask,
    task.map(
      readonlyArray.sequence(either.getApplicativeValidation(readonlyArray.getSemigroup<L>()))
    )
  );
