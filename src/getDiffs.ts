import { diffLines } from 'diff';
import { apply, either, readonlyArray, readonlyRecord } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import { match } from 'ts-pattern';

import type { Change } from './type';

const stringifyFailed = (details: unknown) => ({ code: 'serialization failed' as const, details });

const stringify = (obj: unknown) =>
  either.tryCatch(() => JSON.stringify(obj, undefined, 2), stringifyFailed);

export const getDiffs = (result: { readonly expected: unknown; readonly actual: unknown }) =>
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
