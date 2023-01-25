import { either, readonlyArray, string } from 'fp-ts';
import { identity, pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';
import c from 'picocolors';
import { match } from 'ts-pattern';

import type {
  Change,
  TestError,
  TestFail,
  TestResult,
  TestUnitLeft,
  TestUnitResult,
} from '../../type';

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

export const formatTestError = (error: TestError.Union): readonly string[] =>
  match(error)
    .with({ code: 'AssertionError' }, ({ changes }) =>
      readonlyArray.flatten([changesNums(changes), changesToString(changes)])
    )
    .otherwise((err) => pipe(JSON.stringify(err, undefined, 2), string.split('\n')));

export const testErrorToLines = (
  testUnitLeft: TestUnitLeft,
  value: TestError.Union
): readonly string[] =>
  pipe(
    value,
    formatTestError,
    readonlyArray.prepend(''),
    readonlyArray.prepend(c.red(c.bold(`${testUnitLeft.value.code}`))),
    readonlyArray.prepend(`${c.red(c.bold(c.inverse(' FAIL ')))} ${testUnitLeft.name}`)
  );

const groupErrorToLines = (
  testUnitLeft: TestUnitLeft,
  results: readonly TestResult[]
): readonly string[] =>
  pipe(
    results,
    readonlyArray.lefts,
    readonlyArray.chain((testFail: TestFail) => testErrorToLines(testUnitLeft, testFail.value))
  );

const formatErrorResult = (testUnitLeft: TestUnitLeft): readonly string[] =>
  match(testUnitLeft.value)
    .with({ code: 'GroupError' }, (groupError): readonly string[] =>
      groupErrorToLines(testUnitLeft, groupError.results)
    )
    .with({ code: 'TestError' }, (testError): readonly string[] =>
      testErrorToLines(testUnitLeft, testError.value)
    )
    .exhaustive();

export const testErrorToContentLines = (results: readonly TestUnitResult[]): readonly string[] =>
  pipe(results, readonlyArray.chain(either.match(formatErrorResult, () => [])));
