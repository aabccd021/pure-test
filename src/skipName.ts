import { boolean, readonlyArray, string, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import type { TaskEither } from 'fp-ts/TaskEither';

export const withSkipNames =
  (names: readonly string[]) =>
  <A extends { readonly name: string }, L, R>(fab: (a: A) => TaskEither<L, R>) =>
  (a: A): TaskEither<L | { readonly error: { readonly type: 'skipped' } }, R> =>
    pipe(
      names,
      readonlyArray.elem(string.Eq)(a.name),
      boolean.matchW(
        () => fab(a),
        () => taskEither.left({ error: { type: 'skipped' as const } })
      )
    );

export const runWithSkipName = <R>(
  te: TaskEither<readonly { readonly error: { readonly type: string } }[], R>
) => pipe(te, taskEither.mapLeft(readonlyArray.filter((tt) => tt.error.type === 'skipped')));
