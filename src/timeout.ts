import { either, task } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type { TaskEither } from 'fp-ts/TaskEither';

import { test } from './core';

type TimedOutError = { readonly type: 'timed out' };

export const withTimeout =
  <L, R>(millis: number): ((ma: TaskEither<L, R>) => TaskEither<L | TimedOutError, R>) =>
  (ma) =>
    task
      .getRaceMonoid<Either<L | TimedOutError, R>>()
      .concat(ma, task.delay(millis)(task.of(either.left({ type: 'timed out' as const }))));

export const withTimeout2 =
  <A, L, R>(fab: (a: A) => TaskEither<L, R>) =>
  (p: A & { readonly timeout?: number }) =>
    pipe(fab(p), withTimeout(p.timeout ?? 5000));

export const testWithTimeout = withTimeout2(test);

export const a = testWithTimeout({
  name: 'aab',
  expect: async () => '',
  toResult: '',
  timeout: 10,
});
