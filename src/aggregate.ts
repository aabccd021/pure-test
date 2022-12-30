import { either, readonlyArray, task, taskEither } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type { Task } from 'fp-ts/Task';
import type { TaskEither } from 'fp-ts/TaskEither';

import { runParallel } from '.';
import { test } from './core';

export const withAggregatedErrors =
  <A extends { readonly name: string }, L, R>(
    fab: (a: A) => TaskEither<L, R>
  ): ((a: A) => TaskEither<readonly { readonly name: A['name']; readonly error: L }[], R>) =>
  (a) =>
    pipe(
      fab(a),
      taskEither.mapLeft((error) => [{ name: a.name, error }])
    );

export const testWithAggregatedErrors = withAggregatedErrors(test);

export const aggregateErrors = <A, L, R>(
  a: Task<readonly Either<readonly { readonly name: A; readonly error: L }[], R>[]>
) =>
  pipe(
    a,
    task.map(
      readonlyArray.sequence(
        either.getApplicativeValidation(
          readonlyArray.getSemigroup<{ readonly name: A; readonly error: L }>()
        )
      )
    )
  );

export const res = pipe(
  [
    testWithAggregatedErrors({ name: 'aab', expect: async () => '', toResult: '' }),
    testWithAggregatedErrors({ name: 'ccd', expect: async () => '', toResult: '' }),
  ],
  runParallel,
  aggregateErrors
);

export const a = res();
