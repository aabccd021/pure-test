import { either, readonlyArray, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import type { Change } from '../../src';
import { runTests, test, testW } from '../../src';

type Case = {
  readonly name: string;
  readonly actual: unknown;
  readonly expected: unknown;
  readonly error: {
    readonly diff: readonly Change[];
    readonly actual: unknown;
    readonly expected: unknown;
  };
};

const caseToTest = (tc: Case) =>
  test({
    name: tc.name,
    act: pipe(
      [
        testW({
          name: 'foo',
          act: task.of(tc.actual),
          assert: tc.expected,
        }),
      ],
      runTests({})
    ),
    assert: [
      either.left({
        name: 'foo',
        error: {
          code: 'AssertionError' as const,
          ...tc.error,
        },
      }),
    ],
  });

const cases: readonly Case[] = [
  {
    name: 'minus diff is logged with minus(-) prefix and red(31) color',
    actual: { minus: 'minusValue' },
    expected: {},
    error: {
      actual: { minus: 'minusValue' },
      expected: {},
      diff: [
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
      diff: [
        { type: '0', value: `{` },
        { type: '-', value: `  "plus": "plusValue",` },
        { type: '0', value: `}` },
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
      diff: [
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
      diff: [
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
      diff: [
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
      diff: [
        { type: '-', value: `"undefined"` },
        { type: '+', value: `undefined` },
      ],
    },
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
