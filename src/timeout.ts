import { task, taskEither } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type { TaskEither } from 'fp-ts/TaskEither';

import { test } from './core';

const timedOutError = { type: 'timed out' } as const;

export const withTimeout =
  <A, L, R>(fab: (a: A) => TaskEither<L, R>) =>
  (p: A & { readonly timeout?: number }) =>
    pipe(fab(p), (ma) =>
      task
        .getRaceMonoid<Either<L | { readonly error: typeof timedOutError }, R>>()
        .concat(ma, task.delay(p.timeout ?? 5000)(taskEither.left({ error: timedOutError })))
    );

export const testWithTimeout = withTimeout(test);
