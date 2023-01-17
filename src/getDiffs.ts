import { diffLines } from 'diff';
import { apply, either, readonlyArray, readonlyRecord } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import { match } from 'ts-pattern';

const stringify = (obj: unknown) =>
  obj === undefined
    ? either.right('undefined')
    : either.tryCatch(
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

export const getDiffs = (result: { readonly expected: unknown; readonly actual: unknown }) =>
  pipe(
    result,
    readonlyRecord.map(stringify),
    apply.sequenceS(either.Apply),
    either.map(({ expected, actual }) => diffLines(expected, actual)),
    either.map(
      readonlyArray.map((change) =>
        match(change)
          .with({ added: true }, ({ value }) => ({ type: '+' as const, value }))
          .with({ removed: true }, ({ value }) => ({ type: '-' as const, value }))
          .otherwise(({ value }) => ({ type: '0' as const, value }))
      )
    )
  );
