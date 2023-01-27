import { either, readonlyArray, string } from 'fp-ts';
import { identity, pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';
import c from 'picocolors';
import { match } from 'ts-pattern';

import type { Change, Named, TestUnitResult } from '../../type';
import { TestError, TestUnitError } from '../../type';

const border = (x: string) => ` ${x} `;

const indent = readonlyArray.map((x: string) => `  ${x}`);

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

const changeToString = (change: Change) =>
  pipe(change.value, std.string.prepend(`${getPrefix(change.type)} `), getColor(change.type));

const changesToLines = readonlyArray.map(changeToString);

const getChangesCount = (changes: readonly Change[], changeType: Change['type']): number =>
  pipe(
    changes,
    readonlyArray.filter((change) => change.type === changeType),
    readonlyArray.size
  );

const changesToSummaryLines = (changes: readonly Change[]): readonly string[] => [
  '',
  c.green(`- Expected  - ${getChangesCount(changes, '-')}`),
  c.red(`+ Received  + ${getChangesCount(changes, '+')}`),
  '',
];

const testErrorToContentLines: (testError: TestError) => readonly string[] = TestError.matchStrict({
  AssertionError: ({ changes }) =>
    pipe([changesToSummaryLines(changes), changesToLines(changes)], readonlyArray.flatten, indent),

  TimedOut: () => ['Test timed out'],
  SerializationError: ({ path, forceSerializedValue }) =>
    pipe(
      path,
      readonlyArray.map((numberOrString) => `.${numberOrString}`),
      readonlyArray.intercalate(string.Monoid)(''),
      (pathStr) => [`Error to serialize object on path: ${pathStr}`, forceSerializedValue]
    ),
  UnhandledException: ({ exception }) =>
    readonlyArray.flatten([
      ['Unhanandled exception thrown: '],
      string.split('\n')(JSON.stringify(exception.serialized, undefined, 2)),
    ]),
});

const testErrorToLines = (testError: TestError): readonly string[] =>
  readonlyArray.flatten([[c.red(c.bold(testError.code))], testErrorToContentLines(testError)]);

const testUnitErrorToLines = TestUnitError.matchStrict({
  TestError: ({ value }) => testErrorToLines(value),
  GroupError: ({ results }) =>
    pipe(
      results,
      readonlyArray.lefts,
      readonlyArray.chain((testFail: Named<TestError>): readonly string[] =>
        pipe(
          [
            ['', `${c.red(c.bold(c.inverse(border('FAIL'))))} ${c.bold(testFail.name)}`],
            testErrorToLines(testFail.value),
          ],
          readonlyArray.flatten,
          indent
        )
      )
    ),
});

const formatErrorResult = (testUnitLeft: Named<TestUnitError>): readonly string[] =>
  readonlyArray.flatten([
    [`${c.red(c.bold(c.inverse(border('FAIL'))))} ${c.bold(testUnitLeft.name)}`],
    testUnitErrorToLines(testUnitLeft.value),
  ]);

export const testRunErrorToLines = (results: readonly TestUnitResult[]): readonly string[] =>
  pipe(
    results,
    readonlyArray.map(either.match(formatErrorResult, () => [])),
    readonlyArray.filter(readonlyArray.isNonEmpty),
    readonlyArray.intersperse(readonlyArray.of('')),
    readonlyArray.flatten
  );
