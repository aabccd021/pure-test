import { readonlyArray, taskEither } from 'fp-ts';
import type { Apply1 } from 'fp-ts/Apply';
import { pipe } from 'fp-ts/function';
import type { TaskEither } from 'fp-ts/TaskEither';

import { runTestPar, test } from './core';
import { withName } from './name';

export const withAggregatedErrors =
  <A extends { readonly name: string }, L, R>(
    fab: (a: A) => TaskEither<L, R>
  ): ((a: A) => TaskEither<readonly { readonly name: A['name']; readonly error: L }[], R>) =>
  (a) =>
    pipe(
      fab(a),
      taskEither.mapLeft((error) => [{ name: a.name, error }])
    );

export const testWithAggregatedErrors = withAggregatedErrors(withName(test));

const runWithAggregatedErrors = <E>(a: Apply1<'Task'>) =>
  taskEither.getApplicativeTaskValidation(a, readonlyArray.getSemigroup<E>());

const runTest = runWithAggregatedErrors(runTestPar);

export const res = pipe(
  [
    testWithAggregatedErrors({ name: 'aab', expect: async () => '', toResult: '' }),
    testWithAggregatedErrors({ name: 'ccd', expect: async () => '', toResult: '' }),
  ],
  readonlyArray.traverseWithIndex(runTest)((_, v) => v)
);

export const a = res();
