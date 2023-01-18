import { readonlyArray, string, taskEither } from 'fp-ts';
import { flow, identity, pipe } from 'fp-ts/function';
import type { IO } from 'fp-ts/IO';
import type { TaskEither } from 'fp-ts/TaskEither';
import * as std from 'fp-ts-std';
import c from 'picocolors';
import { match } from 'ts-pattern';

import type { Change, TestError, TestFailedResult } from './type';

const getPrefix = (changeType: Change['type']) =>
  match(changeType)
    .with('+', () => '+')
    .with('-', () => '-')
    .with('0', () => ' ')
    .exhaustive();

const getColor = (changeType: Change['type']): ((s: string) => string) =>
  match(changeType)
    .with('+', () => c.red)
    .with('-', () => c.green)
    .with('0', () => identity)
    .exhaustive();

const formatChangeStr = (change: Change) =>
  pipe(change.value, std.string.prepend(`${getPrefix(change.type)} `), getColor(change.type));

const getChangeNum = (diff: readonly Change[], changeType: Change['type']) =>
  pipe(
    diff,
    readonlyArray.filter((change) => change.type === changeType),
    readonlyArray.size
  );

const diffNums = (diff: readonly Change[]) => [
  c.green(`- Expected  - ${getChangeNum(diff, '-')}`),
  c.red(`+ Received  + ${getChangeNum(diff, '+')}`),
  '',
];

const diffToString = readonlyArray.map(formatChangeStr);

const formatError = (error: TestError): string =>
  match(error)
    .with({ code: 'AssertionError' }, ({ diff }) =>
      pipe(
        [diffNums(diff), diffToString(diff)],
        readonlyArray.flatten,
        readonlyArray.intercalate(string.Monoid)('\n')
      )
    )
    .otherwise((err) => JSON.stringify(err, undefined, 2));

const indent = flow(
  string.split('\n'),
  readonlyArray.map(std.string.prepend('  ')),
  readonlyArray.intercalate(string.Monoid)('\n')
);

const formatErrorResult = (errorResult: TestFailedResult) => [
  `${c.red(c.bold(c.inverse(' FAIL ')))} ${errorResult.name}`,
  c.red(c.bold(`${errorResult.error.code}:`)),
  '',
  pipe(errorResult.error, formatError, indent),
  '',
];

export const logErrorsF =
  (env: { readonly console: { readonly log: (str: string) => IO<void> } }) =>
  (res: TaskEither<readonly TestFailedResult[], undefined>) =>
    pipe(
      res,
      taskEither.swap,
      taskEither.map(
        flow(readonlyArray.chain(formatErrorResult), readonlyArray.intercalate(string.Monoid)('\n'))
      ),
      taskEither.chainIOK(env.console.log),
      taskEither.swap
    );
