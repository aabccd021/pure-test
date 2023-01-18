import type { console } from 'fp-ts';
import { readonlyArray, string, taskEither } from 'fp-ts';
import { flow, identity, pipe } from 'fp-ts/function';
import type { TaskEither } from 'fp-ts/TaskEither';
import * as std from 'fp-ts-std';
import c from 'picocolors';
import { match } from 'ts-pattern';

import type { Change, TestFailedResult } from './type';

const removeLastNewLine = (str: string) =>
  string.endsWith('\n')(str)
    ? pipe(
        str,
        string.split(''),
        readonlyArray.dropRight(1),
        readonlyArray.intercalate(string.Monoid)('')
      )
    : str;

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

const formatChangeStr = ({
  str,
  changeType,
}: {
  readonly str: string;
  readonly changeType: Change['type'];
}) => pipe(str, std.string.prepend(`${getPrefix(changeType)} `), getColor(changeType));

const changeToString = (change: Change) =>
  pipe(
    change.value,
    removeLastNewLine,
    string.split('\n'),
    readonlyArray.map((str) => formatChangeStr({ str, changeType: change.type })),
    readonlyArray.intercalate(string.Monoid)('\n')
  );

const diffToString = flow(
  readonlyArray.map(changeToString),
  readonlyArray.intercalate(string.Monoid)('\n')
);

const formatTestError = (testFailedResult: TestFailedResult): string =>
  match(testFailedResult.error)
    .with({ code: 'not equal' }, ({ diff }) => diffToString(diff))
    .otherwise((err) => JSON.stringify(err, undefined, 2));

type Env = { readonly console: Pick<typeof console, 'log'> };

const formatError = (error: TestFailedResult) =>
  `${c.red(c.bold(c.inverse(' FAIL ')))} ${error.name}\n` + `${formatTestError(error)}`;

export const logErrorsF = (env: Env) => (res: TaskEither<readonly TestFailedResult[], undefined>) =>
  pipe(
    res,
    taskEither.swap,
    taskEither.map(
      flow(readonlyArray.map(formatError), readonlyArray.intercalate(string.Monoid)('\n\n'))
    ),
    taskEither.chainIOK(env.console.log),
    taskEither.swap
  );
