import { readerTaskEither } from 'fp-ts';
import { identity, pipe } from 'fp-ts/function';
import type { ReaderTaskEither } from 'fp-ts/ReaderTaskEither';

type WithName = <A, L, R>(
  fab: ReaderTaskEither<A, L, R>
) => // eslint-disable-next-line functional/prefer-tacit
ReaderTaskEither<A & { readonly name: string }, L, R>;

export const withName: WithName = identity;

export const withNamedErrors = <A extends { readonly name: string }, L, R>(
  fab: ReaderTaskEither<A, L, R>
): ReaderTaskEither<A, L & { readonly name: A['name'] }, R> =>
  pipe(
    readerTaskEither.ask<A>(),
    readerTaskEither.chain((a) =>
      pipe(
        fab,
        readerTaskEither.mapLeft((error) => ({ ...error, name: a.name }))
      )
    )
  );
