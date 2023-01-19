import {
  apply,
  boolean,
  either,
  readonlyArray,
  readonlyNonEmptyArray,
  readonlyRecord,
  string,
} from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { flow, pipe } from 'fp-ts/function';
import type { ReadonlyNonEmptyArray } from 'fp-ts/ReadonlyNonEmptyArray';
import * as iots from 'io-ts';

import { diffLines } from '../libs/diffLines';
import type { AssertEqual, AssertionError, Change, SerializationError } from '../type';

const hasAnyChange = readonlyArray.foldMap(boolean.MonoidAll)((diff: Change) => diff.type === '0');

const assertionFailed =
  (result: { readonly expected: unknown; readonly actual: unknown }) =>
  (diff: readonly Change[]) => ({
    code: 'AssertionError' as const,
    diff,
    actual: result.actual,
    expected: result.expected,
  });

const serializeToLines =
  (path: readonly (number | string)[]) =>
  (obj: unknown): Either<SerializationError, ReadonlyNonEmptyArray<string>> =>
    typeof obj === 'boolean' || typeof obj === 'number' || typeof obj === 'string' || obj === null
      ? either.right([JSON.stringify(obj)])
      : obj === undefined
      ? either.right(['undefined'])
      : Array.isArray(obj)
      ? pipe(
          obj,
          readonlyArray.traverseWithIndex(either.Applicative)((k, v) =>
            serializeToLines([...path, k])(v)
          ),
          either.map(
            flow(
              readonlyArray.flatten,
              readonlyArray.map((x) => `  ${x},`),
              (xs) => [`[`, ...xs, `]`]
            )
          )
        )
      : pipe(
          obj,
          iots.UnknownRecord.decode,
          either.mapLeft(() => ({ code: 'SerializationError' as const, path })),
          either.chain(
            readonlyRecord.traverseWithIndex(either.Applicative)((k, v) =>
              serializeToLines([...path, k])(v)
            )
          ),
          either.map(
            flow(
              readonlyRecord.foldMapWithIndex(string.Ord)(readonlyArray.getMonoid<string>())(
                (k, v) =>
                  pipe(
                    v,
                    readonlyNonEmptyArray.modifyHead((x) => `"${k}": ${x}`),
                    readonlyNonEmptyArray.modifyLast((x) => `${x},`)
                  )
              ),
              readonlyArray.map((x) => `  ${x}`),
              (xs) => [`{`, ...xs, `}`]
            )
          )
        );

const serialize = flow(
  serializeToLines([]),
  either.map(readonlyArray.intercalate(string.Monoid)('\n'))
);

export const runAssertion = (result: AssertEqual): Either<AssertionError, unknown> =>
  pipe(
    result,
    readonlyRecord.map(serialize),
    apply.sequenceS(either.Apply),
    either.map(diffLines),
    either.chainW(either.fromPredicate(hasAnyChange, assertionFailed(result)))
  );
