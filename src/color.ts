import type { Change } from 'diff';
import { boolean, readonlyArray, string, taskEither } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import type { TaskEither } from 'fp-ts/TaskEither';
import { match } from 'ts-pattern';

const colored = (prefix: string, color: string) => (change: Change) =>
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

const coloredDiff = flow(
  readonlyArray.map((change: Change) =>
    match(change)
      .with({ added: true }, colored('+ ', '32'))
      .with({ removed: true }, colored('- ', '31'))
      .otherwise(colored('  ', '90'))
  ),
  readonlyArray.intercalate(string.Monoid)('\n')
);

export const runWithColoredDiff = <
  E extends { readonly type: 'assertion failed'; readonly changes: readonly Change[] },
  R
>(
  te: TaskEither<
    readonly {
      readonly error: E;
    }[],
    R
  >
) =>
  pipe(
    te,
    taskEither.mapLeft(
      readonlyArray.map((tt) =>
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        tt.error.type === 'assertion failed'
          ? {
              ...tt,
              error: {
                type: 'assertion failed' as const,
                changes: coloredDiff(tt.error.changes),
              },
            }
          : tt
      )
    )
  );
