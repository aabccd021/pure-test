import { identity } from 'fp-ts/function';
import type { TaskEither } from 'fp-ts/TaskEither';

type WithName = <A, L, R>(
  fab: (a: A) => TaskEither<L, R>
) => // eslint-disable-next-line functional/prefer-tacit
(p: A & { readonly name: string }) => TaskEither<L, R>;

export const withName: WithName = identity;
