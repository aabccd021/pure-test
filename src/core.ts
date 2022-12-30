import type { Change } from 'diff';
import { diffLines } from 'diff';
import { apply, boolean, either, readonlyArray, readonlyRecord, string, taskEither } from 'fp-ts';
import { flow, identity, pipe } from 'fp-ts/function';
import type { Task } from 'fp-ts/Task';
import { match } from 'ts-pattern';

export const test = <T>(param: {
  readonly name: string;
  readonly expect: Task<T>;
  readonly toResult: T;
}) =>
  pipe(
    taskEither.tryCatch(param.expect, identity),
    taskEither.mapLeft((err) => ({ type: 'unhandled exception' as const, err })),
    taskEither.chainEitherKW((actual) =>
      pipe(
        { expected: param.toResult, actual },
        readonlyRecord.map((obj) =>
          either.tryCatch(() => JSON.stringify(obj, undefined, 2), identity)
        ),
        apply.sequenceS(either.Apply),
        either.bimap(
          (err) => ({ type: 'stringify error' as const, err }),
          ({ expected: expectedStr, actual: actualStr }) => diffLines(expectedStr, actualStr)
        ),
        either.chainW(
          either.fromPredicate(
            readonlyArray.foldMap(boolean.MonoidAll)(
              (change) => change.added !== true && change.removed !== true
            ),
            (changes) => ({ type: 'assertion failed' as const, changes })
          )
        ),
        either.map(() => undefined)
      )
    )
  );

const coloredText = (prefix: string, color: string) => (change: Change) =>
  pipe(
    change.value,
    string.endsWith('\n'),
    boolean.match(
      () => change.value,
      () => string.slice(0, string.size(change.value) - 1)(change.value)
    ),
    string.split('\n'),
    readonlyArray.map((line) => `\x1b[${color}m${prefix}${line}\x1b[0m`),
    readonlyArray.intercalate(string.Monoid)(`\n`)
  );

export const coloredDiff = flow(
  readonlyArray.map((change: Change) =>
    match(change)
      .with({ added: true }, coloredText('+ ', '32'))
      .with({ removed: true }, coloredText('- ', '31'))
      .otherwise(coloredText('  ', '90'))
  ),
  readonlyArray.intercalate(string.Monoid)('\n')
);
