import type { AssertEqual } from '@src';
import { UnknownRecord } from '@src';
import {
  either as E,
  number,
  option as O,
  readonlyArray,
  readonlyRecord,
  string,
  task as T,
} from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type { Option } from 'fp-ts/Option';
import type { Task } from 'fp-ts/Task';
import type { TaskEither } from 'fp-ts/TaskEither';
import type { DeepPartial } from 'ts-essentials';

export const equal =
  <T>(expected: T) =>
  (received: T): AssertEqual => ({ expected, received });

export const equalW =
  (expected: unknown) =>
  (received: unknown): AssertEqual => ({ expected, received });

export const equalOption =
  <T>(expected: Option<T>) =>
  (received: Option<T>): AssertEqual => ({ expected, received });

export const equalEither =
  <L, R>(expected: Either<L, R>) =>
  (received: Either<L, R>): AssertEqual => ({ expected, received });

export const equalArray =
  <T>(expected: readonly T[]) =>
  (received: readonly T[]): AssertEqual => ({ expected, received });

export const numberArrayIsSortedAsc = (received: readonly number[]): AssertEqual => ({
  expected: readonlyArray.sort(number.Ord)(received),
  received,
});

export const stringInLinesEqual =
  (expected: readonly string[]) =>
  (received: string): AssertEqual => ({ expected, received: string.split('\n')(received) });

const pick = (big: unknown, small: unknown): unknown =>
  Array.isArray(big) && Array.isArray(small)
    ? pipe(
        big,
        readonlyArray.mapWithIndex((bigIdx, bigV) =>
          pipe(
            small,
            readonlyArray.lookup(bigIdx),
            O.getOrElseW(() => undefined),
            (smallV) => pick(bigV, smallV)
          )
        )
      )
    : UnknownRecord.type.is(big) && UnknownRecord.type.is(small)
    ? pipe(
        small,
        readonlyRecord.filterMapWithIndex((smallIdx, smallV) =>
          pipe(
            big,
            readonlyRecord.lookup(smallIdx),
            O.map((bigV) => pick(bigV, smallV))
          )
        )
      )
    : big;

export const equalDeepPartial =
  <T>(expected: DeepPartial<T>) =>
  (received: T) =>
    pipe(pick(received, expected), equalW(expected));

export const option =
  <A>(toAssert: (r: A) => AssertEqual) =>
  (o: Option<A>): AssertEqual =>
    O.isSome(o) ? toAssert(o.value) : equal({ _tag: 'Some' })(o);

export const either =
  <L, R>(toAssert: (r: R) => AssertEqual) =>
  (e: Either<L, R>): AssertEqual =>
    E.isRight(e) ? toAssert(e.right) : equal({ _tag: 'Right' })(e);

export const eitherLeft =
  <L, R>(toAssert: (r: L) => AssertEqual) =>
  (e: Either<L, R>): AssertEqual =>
    E.isLeft(e) ? toAssert(e.left) : equal({ _tag: 'Left' })(e);

export const taskEither =
  <L, R>(toAssert: (r: R) => AssertEqual) =>
  (te: TaskEither<L, R>): Task<AssertEqual> =>
    pipe(
      te,
      T.map((e) => (E.isRight(e) ? toAssert(e.right) : equal({ _tag: 'Right' })(e)))
    );

export const taskEitherLeft =
  <L, R>(toAssert: (l: L) => AssertEqual) =>
  (te: TaskEither<L, R>): Task<AssertEqual> =>
    pipe(
      te,
      T.map((e) => (E.isLeft(e) ? toAssert(e.left) : equal({ _tag: 'Left' })(e)))
    );

export const task = T.map;
