import { diffLines } from 'diff';
import { apply, boolean, either, readonlyArray, readonlyRecord } from 'fp-ts';
import { pipe } from 'fp-ts/function';

export const assert = (param: { readonly expected: unknown; readonly actual: unknown }) =>
  pipe(
    param,
    readonlyRecord.map((obj) =>
      either.tryCatch(
        () => JSON.stringify(obj, undefined, 2),
        (details) => ({ error: 'stringify failed' as const, details })
      )
    ),
    apply.sequenceS(either.Apply),
    either.map(({ expected: expectedStr, actual: actualStr }) => diffLines(expectedStr, actualStr)),
    either.chainW(
      either.fromPredicate(
        readonlyArray.foldMap(boolean.MonoidAll)(
          (change) => change.added !== true && change.removed !== true
        ),
        (differences) => ({ error: 'assertion failed' as const, differences })
      )
    ),
    either.map(() => undefined)
  );
