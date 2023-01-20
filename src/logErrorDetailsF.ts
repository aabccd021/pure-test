import { either, readonlyArray, string, task } from 'fp-ts';
import { flow, identity, pipe } from 'fp-ts/function';
import type { IO } from 'fp-ts/IO';
import type { Task } from 'fp-ts/Task';
import * as std from 'fp-ts-std';
import * as c from 'picocolors';
import { match } from 'ts-pattern';

import type { Change, TestError, TestFailResult, TestResult } from './type';

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

const formatError = (error: TestError): readonly string[] =>
  match(error)
    .with({ code: 'AssertionError' }, ({ diff }) =>
      readonlyArray.flatten([diffNums(diff), diffToString(diff)])
    )
    .otherwise((err) => [JSON.stringify(err, undefined, 2)]);

const formatErrorResult = (errorResult: TestFailResult): readonly string[] => [
  `${c.red(c.bold(c.inverse(' FAIL ')))} ${errorResult.name}`,
  c.red(c.bold(`${errorResult.error.code}:`)),
  '',
  ...pipe(errorResult.error, formatError, readonlyArray.map(std.string.prepend('  '))),
  '',
];

export const logErrorDetailsF = (env: {
  readonly console: { readonly log: (str: string) => IO<void> };
}): ((res: Task<readonly TestResult[]>) => Task<readonly TestResult[]>) =>
  task.chainFirstIOK(
    flow(
      readonlyArray.chain(either.match(formatErrorResult, () => [])),
      readonlyArray.intercalate(string.Monoid)('\n'),
      env.console.log
    )
  );
