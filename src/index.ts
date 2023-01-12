import type { Change } from 'diff';
import { boolean, console, either, io, readonlyArray, string, task, taskEither } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { flow, identity, pipe } from 'fp-ts/function';
import type { Task } from 'fp-ts/Task';
import type { TaskEither } from 'fp-ts/TaskEither';
import { match } from 'ts-pattern';

import type { SingleAssertionTest } from './type';

export const test = (t: Omit<SingleAssertionTest, 'type'>): SingleAssertionTest => ({
  ...t,
  type: 'single',
});

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

const formatTestError = (testResultError: TestErrorResult) =>
  match(testResultError.error)
    .with({ type: 'changes' }, ({ changes }) =>
      pipe(
        changes,
        readonlyArray.map((change) =>
          match(change)
            .with({ added: true }, colored('+ ', '32'))
            .with({ removed: true }, colored('- ', '31'))
            .otherwise(colored('  ', '90'))
        ),
        readonlyArray.intercalate(string.Monoid)('\n')
      )
    )
    .otherwise(identity);

export const logErrorsF =
  (c: Pick<typeof console, 'log'>) => (res: TaskEither<readonly TestErrorResult[], unknown>) =>
    pipe(
      res,
      taskEither.swap,
      taskEither.chainFirstIOK(
        readonlyArray.traverse(io.Applicative)((error) =>
          pipe(
            c.log(`\n${error.name}`),
            io.chain(() => c.log(formatTestError(error)))
          )
        )
      ),
      taskEither.swap
    );

export const logErrors = logErrorsF(console);

export const setExitCodeF = (p: Pick<typeof process, 'exitCode'>) =>
  flow(
    taskEither.swap,
    // eslint-disable-next-line functional/no-return-void
    taskEither.chainFirstIOK(() => () => {
      // eslint-disable-next-line functional/immutable-data, functional/no-expression-statement
      p.exitCode = 1;
    }),
    taskEither.swap
  );

export const setExitCode = setExitCodeF(process);
