import type { Change } from 'diff';
import type { console } from 'fp-ts';
import { boolean, io, readonlyArray, string, taskEither } from 'fp-ts';
import { flow, identity, pipe } from 'fp-ts/function';
import type { TaskEither } from 'fp-ts/TaskEither';
import * as std from 'fp-ts-std';
import { match } from 'ts-pattern';

import type { TestFailedResult } from './type';

const dropLastChar = flow(
  string.split(''),
  readonlyArray.dropRight(1),
  readonlyArray.intercalate(string.Monoid)('')
);

const withNoLastNewline = (mapper: (s: string) => string) => (str: string) =>
  pipe(
    str,
    string.endsWith('\n'),
    boolean.match(
      () => pipe(str, mapper),
      () => pipe(str, dropLastChar, mapper, std.string.append('\n'))
    )
  );

const mapEachLine = (mapper: (s: string) => string) => (str: string) =>
  pipe(
    str,
    withNoLastNewline(
      flow(
        string.split('\n'),
        readonlyArray.map(mapper),
        readonlyArray.intercalate(string.Monoid)('\n')
      )
    )
  );

const colorStr = (param: { readonly color: string }) => (str: string) =>
  `\x1b[${param.color}m$${str}\x1b[0m`;

const prefixAndColorDiff =
  (param: { readonly prefix: string; readonly color: string }) => (change: Change) =>
    pipe(
      change.value,
      mapEachLine(flow(std.string.prepend(param.prefix), colorStr({ color: param.color })))
    );

const formatDiff = (diff: Change) =>
  match(diff)
    .with({ added: true }, prefixAndColorDiff({ prefix: '+ ', color: '32' }))
    .with({ removed: true }, prefixAndColorDiff({ prefix: '- ', color: '31' }))
    .otherwise(prefixAndColorDiff({ prefix: '  ', color: '90' }));

const formatDiffs = flow(
  readonlyArray.map(formatDiff),
  readonlyArray.intercalate(string.Monoid)('\n')
);

const formatTestError = (testFailedResult: TestFailedResult) =>
  match(testFailedResult.error)
    .with({ code: 'assertion failed' }, ({ diffs }) => formatDiffs(diffs))
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
