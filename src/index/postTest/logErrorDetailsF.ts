import { either, readonlyArray, string, taskEither } from 'fp-ts';
import { flow, identity, pipe } from 'fp-ts/function';
import type { IO } from 'fp-ts/IO';
import type { Task } from 'fp-ts/Task';
import * as std from 'fp-ts-std';
import c from 'picocolors';
import { match } from 'ts-pattern';

import type { Change, SuiteError, SuiteResult, TestError, TestFailResult } from '../type';
import { shardingErrorToLines } from './logTestsNameAndResults/shardingErrorToLines';

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

const getChangeNum = (changes: readonly Change[], changeType: Change['type']) =>
  pipe(
    changes,
    readonlyArray.filter((change) => change.type === changeType),
    readonlyArray.size
  );

const changesNums = (changes: readonly Change[]) => [
  c.green(`- Expected  - ${getChangeNum(changes, '-')}`),
  c.red(`+ Received  + ${getChangeNum(changes, '+')}`),
  '',
];

const changesToString = readonlyArray.map(formatChangeStr);

const formatTestError = (
  error: Exclude<TestError, { readonly code: 'Skipped' }>
): readonly string[] =>
  match(error)
    .with({ code: 'AssertionError' }, ({ changes }) =>
      readonlyArray.flatten([changesNums(changes), changesToString(changes)])
    )
    .otherwise((err) => pipe(JSON.stringify(err, undefined, 2), string.split('\n')));

const formatErrorResult = (errorResult: TestFailResult): readonly string[] =>
  errorResult.error.code === 'Skipped'
    ? []
    : [
        `${c.red(c.bold(c.inverse(' FAIL ')))} ${errorResult.name}`,
        c.red(c.bold(`${errorResult.error.code}:`)),
        '',
        ...pipe(errorResult.error, formatTestError, readonlyArray.map(std.string.prepend('  '))),
        '',
      ];

const errorHeader = c.red(c.bold(c.inverse(' ERROR ')));

const suiteErrorToLines = (suiteError: SuiteError): readonly string[] =>
  match(suiteError)
    .with({ type: 'TestError' }, ({ results }) =>
      pipe(results, readonlyArray.chain(either.match(formatErrorResult, () => [])))
    )
    .with({ type: 'DuplicateTestName' }, ({ name }) => [
      `${errorHeader} Duplicate test name found: ${name}`,
    ])
    .with({ type: 'ShardingError' }, ({ value }) =>
      pipe(value, shardingErrorToLines, readonlyArray.prepend(`${errorHeader} ShardingError`))
    )
    .exhaustive();

export const logErrorDetailsF = (env: {
  readonly console: { readonly log: (str: string) => IO<void> };
}): ((res: Task<SuiteResult>) => Task<SuiteResult>) =>
  flow(
    taskEither.swap,
    taskEither.chainFirstIOK(
      flow(suiteErrorToLines, readonlyArray.intercalate(string.Monoid)('\n'), env.console.log)
    ),
    taskEither.swap
  );
