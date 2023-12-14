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

import { diffLines } from '../_internal/libs/diffLines';
import type { Change } from '../type';
import { TestError, UnknownRecord } from '../type';

const indent = (line: string): string => `  ${line}`;

const unknownToLines =
  (path: readonly string[]) =>
  (obj: unknown): Either<readonly string[], ReadonlyNonEmptyArray<string>> =>
    typeof obj === 'boolean' || typeof obj === 'number' || typeof obj === 'string' || obj === null
      ? either.right([JSON.stringify(obj)])
      : obj === undefined
      ? either.right(['undefined'])
      : Array.isArray(obj)
      ? pipe(
          obj,
          readonlyArray.traverseWithIndex(either.Applicative)((index, value) =>
            unknownToLines([...path, `${index}`])(value)
          ),
          either.map(
            flow(
              readonlyArray.chain(readonlyNonEmptyArray.modifyLast((last) => `${last},`)),
              readonlyArray.map(indent),
              (lines) => [`[`, ...lines, `]`]
            )
          )
        )
      : pipe(
          obj,
          UnknownRecord.type.decode,
          either.mapLeft(() => path),
          either.chain(
            readonlyRecord.traverseWithIndex(either.Applicative)((index, value) =>
              unknownToLines([...path, index])(value)
            )
          ),
          either.map(
            flow(
              readonlyRecord.foldMapWithIndex(string.Ord)(readonlyArray.getMonoid<string>())(
                (key, value) =>
                  pipe(
                    value,
                    readonlyNonEmptyArray.modifyHead((head) => `"${key}": ${head}`),
                    readonlyNonEmptyArray.modifyLast((last) => `${last},`)
                  )
              ),
              readonlyArray.map(indent),
              (lines) => [`{`, ...lines, `}`]
            )
          )
        );

export const assertEqual = ({
  received,
  expected,
}: {
  readonly received: unknown;
  readonly expected: unknown;
}): Either<TestError | TestError, readonly Change[]> =>
  pipe(
    { received, expected },
    readonlyRecord.map((value) =>
      pipe(
        value,
        unknownToLines([]),
        either.bimap(
          (path) =>
            TestError.as.SerializationError({
              path,
              forceSerializedValue: JSON.stringify(value, undefined, 2),
            }),
          readonlyArray.intercalate(string.Monoid)('\n')
        )
      )
    ),
    apply.sequenceS(either.Apply),
    either.map(diffLines),
    either.chainW(
      either.fromPredicate(
        readonlyArray.foldMap(boolean.MonoidAll)((change: Change) => change.type === '0'),
        (changes) => TestError.as.AssertionError({ changes, received, expected })
      )
    )
  );
