import { task } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import type { Task } from 'fp-ts/Task';

import { test } from './core';

export const withPrintTime =
  <A extends { readonly name: string }, B>(fab: (a: A) => Task<B>): ((a: A) => Task<B>) =>
  (a) =>
    pipe(
      // eslint-disable-next-line functional/no-return-void
      task.fromIO(() => console.time(a.name)),
      task.chain(() => fab(a)),
      // eslint-disable-next-line functional/no-return-void
      task.chainFirstIOK(() => () => console.timeEnd(a.name))
    );

export const testWithTimeLog = withPrintTime(test);
