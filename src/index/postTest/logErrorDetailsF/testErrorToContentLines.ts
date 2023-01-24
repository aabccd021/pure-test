import { either, readonlyArray, string } from 'fp-ts';
import { identity, pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';
import c from 'picocolors';
import { match } from 'ts-pattern';

import type { Change, TestError, TestResult } from '../../type';

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

const formatErrorResult = (errorResult: TestResult.Left): readonly string[] =>
  errorResult.error.code === 'Skipped'
    ? []
    : [
        `${c.red(c.bold(c.inverse(' FAIL ')))} ${errorResult.name}`,
        c.red(c.bold(`${errorResult.error.code}:`)),
        '',
        ...formatTestError(errorResult.error),
        '',
      ];

export const testErrorToContentLines = (results: readonly TestResult.Type[]): readonly string[] =>
  pipe(results, readonlyArray.chain(either.match(formatErrorResult, () => [])));
