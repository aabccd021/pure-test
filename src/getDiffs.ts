import { diffLines } from 'diff';
import { apply, array, either, readonlyArray, readonlyRecord, string } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { flow, pipe } from 'fp-ts/function';
import * as iots from 'io-ts';
import { match } from 'ts-pattern';

import type { SerializationError } from './type';

const stringifyE = (
  path: readonly (number | string)[],
  obj: unknown
): Either<SerializationError, string> =>
  typeof obj === 'boolean' || typeof obj === 'number' || typeof obj === 'string' || obj === null
    ? either.right(JSON.stringify(obj))
    : obj === undefined
    ? either.right('undefined')
    : Array.isArray(obj)
    ? pipe(
        obj,
        array.traverseWithIndex(either.Applicative)((k, v) => stringifyE([...path, k], v)),
        either.map(
          flow(
            array.map((x) => `  ${x},\n`),
            array.intercalate(string.Monoid)(''),
            (x) => `[\n${x}]`
          )
        )
      )
    : pipe(
        obj,
        iots.UnknownRecord.decode,
        either.mapLeft(() => ({ code: 'SerializationError' as const, path })),
        either.chain(
          readonlyRecord.traverseWithIndex(either.Applicative)((k, v) =>
            stringifyE([...path, k], v)
          )
        ),
        either.map(
          flow(
            readonlyRecord.foldMapWithIndex(string.Ord)(string.Monoid)(
              (k, v) => `  "${k}": ${v},\n`
            ),
            (x) => `{\n${x}}`
          )
        )
      );

const removeLastNewLine = (str: string) =>
  string.endsWith('\n')(str)
    ? pipe(
        str,
        string.split(''),
        readonlyArray.dropRight(1),
        readonlyArray.intercalate(string.Monoid)('')
      )
    : str;

export const getDiffs = (result: { readonly expected: unknown; readonly actual: unknown }) =>
  pipe(
    result,
    readonlyRecord.map((obj) => stringifyE([], obj)),
    apply.sequenceS(either.Apply),
    either.map(({ expected, actual }) => diffLines(expected, actual)),
    either.map(
      flow(
        readonlyArray.map((change) =>
          match(change)
            .with({ added: true }, ({ value }) => ({ type: '+' as const, value }))
            .with({ removed: true }, ({ value }) => ({ type: '-' as const, value }))
            .otherwise(({ value }) => ({ type: '0' as const, value }))
        ),
        readonlyArray.chain((change) =>
          pipe(
            change.value,
            removeLastNewLine,
            string.split('\n'),
            readonlyArray.map((value) => ({ type: change.type, value }))
          )
        )
      )
    )
  );
