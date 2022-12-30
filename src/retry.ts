import { either } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import type { TaskEither } from 'fp-ts/TaskEither';
import type { RetryPolicy } from 'retry-ts';
import { limitRetries } from 'retry-ts';
import { retrying } from 'retry-ts/lib/Task';

import { test } from './core';

const getRetryPolicy = (t?: RetryPolicy | number) =>
  t === undefined ? limitRetries(0) : typeof t === 'number' ? limitRetries(t) : t;

export const withRetry =
  <A, L, R>(fab: (a: A) => TaskEither<L, R>) =>
  (p: A & { readonly retry?: RetryPolicy | number }) =>
    pipe(fab(p), (ma) => retrying(getRetryPolicy(p.retry), () => ma, either.isLeft));

export const testWithRetry = withRetry(test);
