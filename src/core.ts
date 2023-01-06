import { diffLines } from 'diff';
import { apply, boolean, either, readonlyArray, readonlyRecord, taskEither } from 'fp-ts';
import { identity, pipe } from 'fp-ts/function';
import type { Task } from 'fp-ts/Task';

export const test = <T>(param: { readonly expect: Task<T>; readonly toResult: T }) =>
  pipe(
    taskEither.tryCatch(param.expect, identity),
    taskEither.mapLeft((err) => ({ error: { type: 'unhandled exception' as const, err } })),
    taskEither.chainEitherKW((actual) =>
      pipe(
        { expected: param.toResult, actual },
        readonlyRecord.map((obj) =>
          either.tryCatch(() => JSON.stringify(obj, undefined, 2), identity)
        ),
        apply.sequenceS(either.Apply),
        either.bimap(
          (err) => ({ error: { type: 'stringify error' as const, err } }),
          ({ expected: expectedStr, actual: actualStr }) => diffLines(expectedStr, actualStr)
        ),
        either.chainW(
          either.fromPredicate(
            readonlyArray.foldMap(boolean.MonoidAll)(
              (change) => change.added !== true && change.removed !== true
            ),
            (changes) => ({ error: { type: 'assertion failed' as const, changes } })
          )
        ),
        either.map(() => undefined)
      )
    )
  );
