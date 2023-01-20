import { either as E, option as O, taskEither as TE } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type { Option } from 'fp-ts/Option';
import type { Task } from 'fp-ts/Task';
import type { TaskEither } from 'fp-ts/TaskEither';

import type { Assert, AssertEqual, UnexpectedLeft, UnexpectedNone } from './type';

export const equal =
  <T>(expected: T) =>
  (actual: T): AssertEqual => ({
    type: 'AssertEqual',
    expected,
    actual,
  });

export const equalW =
  (expected: unknown) =>
  (actual: unknown): AssertEqual => ({
    type: 'AssertEqual',
    expected,
    actual,
  });

export const equalOption =
  <T>(expected: Option<T>) =>
  (actual: Option<T>): AssertEqual => ({
    type: 'AssertEqual',
    expected,
    actual,
  });

export const equalEither =
  <L, R>(expected: Either<L, R>) =>
  (actual: Either<L, R>): AssertEqual => ({
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

const unexpectedLeft = (left: unknown): UnexpectedLeft => ({
  type: 'UnexpectedLeft',
  value: left,
});

const unexpectedRight = (left: unknown): UnexpectedLeft => ({
  type: 'UnexpectedLeft',
  value: left,
});

const unexpectedNone: UnexpectedNone = {
  type: 'UnexpectedNone',
};

export const option =
  <A>(toAssert: (r: A) => Assert) =>
  (e: Option<A>): Assert =>
    pipe(
      e,
      O.match(() => unexpectedNone, toAssert)
    );

export const either =
  <L, R>(toAssert: (r: R) => Assert) =>
  (e: Either<L, R>): Assert =>
    pipe(e, E.match(unexpectedLeft, toAssert));

export const eitherLeft =
  <L, R>(toAssert: (r: L) => Assert) =>
  (e: Either<L, R>): Assert =>
    pipe(e, E.swap, E.match(unexpectedRight, toAssert));

export const taskEither =
  <L, R>(toAssert: (r: R) => Assert) =>
  (e: TaskEither<L, R>): Task<Assert> =>
    pipe(e, TE.match(unexpectedLeft, toAssert));

export const taskEitherLeft =
  <L, R>(toAssert: (l: L) => Assert) =>
  (e: TaskEither<L, R>): Task<Assert> =>
    pipe(e, TE.swap, TE.match(unexpectedRight, toAssert));
