import type { console } from 'fp-ts';
import { io, readonlyArray, string, taskEither } from 'fp-ts';
import { flow, identity, pipe } from 'fp-ts/function';
import type { TaskEither } from 'fp-ts/TaskEither';
import * as std from 'fp-ts-std';
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

const colorStr = (param: { readonly color: string }) => (str: string) =>
  `\x1b[${param.color}m${str}\x1b[0m`;

const getChangeFormat = (changeType: Change['type']) =>
  match(changeType)
    .with('+', () => ({ prefix: '+', color: '32' }))
    .with('-', () => ({ prefix: '-', color: '31' }))
    .with('0', () => ({ prefix: ' ', color: '90' }))
    .exhaustive();

const formatChangeStr = ({
  str,
  changeType,
}: {
  readonly str: string;
  readonly changeType: Change['type'];
}) =>
  pipe(changeType, getChangeFormat, ({ prefix, color }) =>
    pipe(str, std.string.prepend(`${prefix} `), colorStr({ color }))
  );

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

const formatTestError = (testFailedResult: TestFailedResult) =>
  match(testFailedResult.error)
    .with({ code: 'not equal' }, ({ diff }) => diffToString(diff))
    .otherwise(identity);

type Env = { readonly console: Pick<typeof console, 'log'> };

const logErrorF = (env: Env) => (error: TestFailedResult) =>
  pipe(
    env.console.log(`\n${error.name}`),
    io.chain(() => env.console.log(formatTestError(error)))
  );

export const logErrorsF = (env: Env) => (res: TaskEither<readonly TestFailedResult[], undefined>) =>
  pipe(
    res,
    taskEither.swap,
    taskEither.chainFirstIOK(readonlyArray.traverse(io.Applicative)(logErrorF(env))),
    taskEither.swap
  );
