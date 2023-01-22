import type { Change, SuiteError } from '@src';
import { assert, runTests, test } from '@src';
import { either, readonlyArray, task, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';

type Case = {
  readonly name: string;
  readonly actual: unknown;
  readonly expected: unknown;
  readonly error: {
    readonly changes: readonly Change[];
    readonly actual: unknown;
    readonly expected: unknown;
  };
};

const caseToTest = (tc: Case) =>
  test({
    name: tc.name,
    act: pipe(
      taskEither.right([
        test({ name: 'foo', act: pipe(tc.actual, assert.equal(tc.expected), task.of) }),
      ]),
      runTests({}),
      assert.taskEitherLeft(
        assert.equal<SuiteError>({
          type: 'TestError',
          results: [either.left({ name: 'foo', error: { code: 'AssertionError', ...tc.error } })],
        })
      )
    ),
  });

const cases: readonly Case[] = [
  {
    name: 'minus diff is logged with minus(-) prefix and red(31) color',
    actual: { minus: 'minusValue' },
    expected: {},
    error: {
      actual: { minus: 'minusValue' },
      expected: {},
      changes: [
        { type: '0', value: `{` },
        { type: '+', value: `  "minus": "minusValue",` },
        { type: '0', value: `}` },
      ],
    },
  },

  {
    name: 'plus diff is logged with plus(+) prefix and green(32) color',
    actual: {},
    expected: { plus: 'plusValue' },
    error: {
      actual: {},
      expected: { plus: 'plusValue' },
      changes: [
        { type: '0', value: `{` },
        { type: '-', value: `  "plus": "plusValue",` },
        { type: '0', value: `}` },
      ],
    },
  },

  {
    name: 'multiple line minus diff is indented correctly',
    actual: { nested: { minus: 'minusValue' } },
    expected: {},
    error: {
      actual: { nested: { minus: 'minusValue' } },
      expected: {},
      changes: [
        { type: '0', value: `{` },
        { type: '+', value: `  "nested": {` },
        { type: '+', value: `    "minus": "minusValue",` },
        { type: '+', value: `  },` },
        { type: '0', value: `}` },
      ],
    },
  },

  {
    name: 'multiple line plus diff is indented correctly',
    actual: {},
    expected: { nested: { plus: 'plusValue' } },
    error: {
      actual: {},
      expected: { nested: { plus: 'plusValue' } },
      changes: [
        { type: '0', value: `{` },
        { type: '-', value: `  "nested": {` },
        { type: '-', value: `    "plus": "plusValue",` },
        { type: '-', value: `  },` },
        { type: '0', value: `}` },
      ],
    },
  },

  {
    name: 'nested array diff has correct comma',
    actual: [['minusValue']],
    expected: [],
    error: {
      actual: [['minusValue']],
      expected: [],
      changes: [
        { type: '0', value: `[` },
        { type: '+', value: `  [` },
        { type: '+', value: `    "minusValue",` },
        { type: '+', value: `  ],` },
        { type: '0', value: `]` },
      ],
    },
  },

  {
    name: 'can use undefined in actual',
    actual: { minus: 'minusValue' },
    expected: undefined,
    error: {
      actual: { minus: 'minusValue' },
      expected: undefined,
      changes: [
        { type: '-', value: `undefined` },
        { type: '+', value: `{` },
        { type: '+', value: `  "minus": "minusValue",` },
        { type: '+', value: `}` },
      ],
    },
  },

  {
    name: 'can use undefined in expected',
    actual: undefined,
    expected: { plus: 'plusValue' },
    error: {
      actual: undefined,
      expected: { plus: 'plusValue' },
      changes: [
        { type: '-', value: `{` },
        { type: '-', value: `  "plus": "plusValue",` },
        { type: '-', value: `}` },
        { type: '+', value: `undefined` },
      ],
    },
  },

  {
    name: 'can differentiate actual undefined and expected string "undefined"',
    actual: 'undefined',
    expected: undefined,
    error: {
      actual: 'undefined',
      expected: undefined,
      changes: [
        { type: '-', value: `undefined` },
        { type: '+', value: `"undefined"` },
      ],
    },
  },

  {
    name: 'can differentiate actual string "undefined" and expected undefined',
    actual: undefined,
    expected: 'undefined',
    error: {
      expected: 'undefined',
      actual: undefined,
      changes: [
        { type: '-', value: `"undefined"` },
        { type: '+', value: `undefined` },
      ],
    },
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
