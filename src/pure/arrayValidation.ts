import { either, readonlyArray } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';

export const lift = <L, R>(e: Either<L, R>) => pipe(e, either.mapLeft(readonlyArray.of));

export const run = <L, R>(results: readonly Either<readonly L[], R>[]) =>
  pipe(
    results,
    readonlyArray.sequence(either.getApplicativeValidation(readonlyArray.getSemigroup<L>()))
  );
