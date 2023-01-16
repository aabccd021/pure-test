import { diffLines } from 'diff';
import { apply, either, readonlyArray, readonlyRecord } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import { match } from 'ts-pattern';

import type { Change } from './type';

const stringify = (obj: unknown) =>
  either.tryCatch(
    () => {
      const s = JSON.stringify(obj, undefined, 2);
      // eslint-disable-next-line functional/no-conditional-statement
      if (typeof s !== 'string') {
        // eslint-disable-next-line functional/no-throw-statement
        throw new Error('Converting unsupported structure to JSON');
      }
      return s;
    },
    (details: unknown) => ({ code: 'serialization failed' as const, details })
  );

export const getDiffsNonUndefined = (result: {
  readonly expected: unknown;
  readonly actual: unknown;
}) =>
  pipe(
    result,
    readonlyRecord.map(stringify),
    apply.sequenceS(either.Apply),
    either.map(({ expected, actual }) => diffLines(expected, actual)),
    either.map(
      readonlyArray.map(
        (change): Change =>
          match(change)
            .with({ added: true }, ({ value }) => ({ type: '+' as const, value }))
            .with({ removed: true }, ({ value }) => ({ type: '-' as const, value }))
            .otherwise(({ value }) => ({ type: '0' as const, value }))
      )
    )
  );

export const getDiffs = (result: { readonly expected: unknown; readonly actual: unknown }) =>
  match(result)
    .with({ expected: undefined, actual: undefined }, () => either.right([]))
    .with({ expected: undefined }, ({ actual }) =>
      pipe(
        actual,
        stringify,
        either.chain((value) =>
          either.right([
            { type: '-' as const, value: 'undefined' },
            { type: '+' as const, value },
          ])
        )
      )
    )
    .with({ actual: undefined }, ({ expected }) =>
      pipe(
        expected,
        stringify,
        either.chain((value) =>
          either.right([
            { type: '-' as const, value },
            { type: '+' as const, value: 'undefined' },
          ])
        )
      )
    )
    .otherwise(getDiffsNonUndefined);
