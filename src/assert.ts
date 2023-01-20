import { either, taskEither } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type { Task } from 'fp-ts/Task';
import type { TaskEither } from 'fp-ts/TaskEither';

import type { Assert, AssertEqual, EitherLeft } from './type';

export const equal =
  <T>(expected: T) =>
  (actual: T): AssertEqual => ({
    type: 'AssertEqual',
    expected,
    actual,
  });

export const equalArray =
  <T>(expected: readonly T[]) =>
  (actual: readonly T[]): AssertEqual => ({
    type: 'AssertEqual',
    expected,
    actual,
  });

export const eitherLeft = (left: unknown): EitherLeft => ({
  type: 'EitherLeft',
  left,
});

export const eitherRightAnd =
  <L, R>(toAssert: (r: R) => Assert) =>
  (e: Either<L, R>): Assert =>
    pipe(e, either.match(eitherLeft, toAssert));

export const taskEitherRightAnd =
  <L, R>(toAssert: (r: R) => Assert) =>
  (e: TaskEither<L, R>): Task<Assert> =>
    pipe(e, taskEither.match(eitherLeft, toAssert));

export const taskEitherLeftAnd =
  <L, R>(toAssert: (l: L) => Assert) =>
  (e: TaskEither<L, R>): Task<Assert> =>
    pipe(e, taskEither.swap, taskEither.match(eitherLeft, toAssert));
