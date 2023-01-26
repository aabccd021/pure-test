import { either, readonlyArray, string } from 'fp-ts';
import { identity, pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';
import c from 'picocolors';
import { match } from 'ts-pattern';

import type { Change, Named, suiteError, TestUnitError } from '../../type';
import { TestError } from '../../type';

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

export const testErrorToContentLines: (testError: TestError['Union']) => readonly string[] =
  TestError.Union.matchStrict({
    AssertionError: ({ changes }) =>
      pipe(
        [changesToSummaryLines(changes), changesToLines(changes)],
        readonlyArray.flatten,
        indent
      ),

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

export const testErrorToLines = (testError: TestError['Union']): readonly string[] =>
  readonlyArray.flatten([[c.red(c.bold(testError.code))], testErrorToContentLines(testError)]);

const testUnitTestErrorToLines = (testError: TestUnitError.TestError): readonly string[] =>
  testErrorToLines(testError.value);

const testUnitGroupErrorToLines = (groupError: TestUnitError.GroupError): readonly string[] =>
  pipe(
    groupError.results,
    readonlyArray.lefts,
    readonlyArray.chain((testFail: Named<TestError['Union']>): readonly string[] =>
      pipe(
        [
          ['', `${c.red(c.bold(c.inverse(border('FAIL'))))} ${c.bold(testFail.name)}`],
          testErrorToLines(testFail.value),
        ],
        readonlyArray.flatten,
        indent
      )
    )
  );

const formatErrorResult = (testUnitLeft: Named<TestUnitError.Union>): readonly string[] =>
  readonlyArray.flatten([
    [`${c.red(c.bold(c.inverse(border('FAIL'))))} ${c.bold(testUnitLeft.name)}`],
    match(testUnitLeft.value)
      .with({ code: 'GroupError' }, testUnitGroupErrorToLines)
      .with({ code: 'TestError' }, testUnitTestErrorToLines)
      .exhaustive(),
  ]);

export const testRunErrorToLines = ({ results }: suiteError.TestRunError): readonly string[] =>
  pipe(
    results,
    readonlyArray.map(either.match(formatErrorResult, () => [])),
    readonlyArray.filter(readonlyArray.isNonEmpty),
    readonlyArray.intersperse(readonlyArray.of('')),
    readonlyArray.flatten
  );
