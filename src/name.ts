import { taskEither } from 'fp-ts';
import { identity, pipe } from 'fp-ts/function';
import type { TaskEither } from 'fp-ts/TaskEither';

type WithName = <A, L, R>(
  fab: (a: A) => TaskEither<L, R>
) => // eslint-disable-next-line functional/prefer-tacit
(p: A & { readonly name: string }) => TaskEither<L, R>;

export const withName: WithName = identity;

export const withNamedErrors =
  <A extends { readonly name: string }, L, R>(
    fab: (a: A) => TaskEither<L, R>
  ): ((a: A) => TaskEither<{ readonly name: A['name']; readonly error: L }, R>) =>
  (a) =>
    pipe(
      fab(a),
      taskEither.mapLeft((error) => ({ name: a.name, error }))
    );
