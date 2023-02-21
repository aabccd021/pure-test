import type { Change, SuiteError } from '@src';
import { assert, runTests, test } from '@src';
import { either, readonlyArray, task, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';

type Case = {
  readonly name: string;
  readonly received: unknown;
  readonly expected: unknown;
  readonly changes: readonly Change[];
};

const caseToTest = (tc: Case) =>
  test({
    name: tc.name,
    act: pipe(
      taskEither.right([
        test({ name: 'foo', act: pipe(tc.received, assert.equal(tc.expected), task.of) }),
      ]),
      runTests({}),
      assert.taskEitherLeft(
        assert.equal<SuiteError>({
          code: 'TestRunError',
          results: [
            either.left({
              name: 'foo',
              value: {
                code: 'TestError',
                value: {
                  code: 'AssertionError',
                  received: tc.received,
                  expected: tc.expected,
                  changes: tc.changes,
                },
              },
            }),
          ],
        })
      )
    ),
  });

const cases: readonly Case[] = [
  {
    name: 'minus diff is logged with minus(-) prefix and red(31) color',
    received: { minus: 'minusValue' },
    expected: {},
    changes: [
      { type: '0', value: `{` },
      { type: '+', value: `  "minus": "minusValue",` },
      { type: '0', value: `}` },
    ],
  },

  {
    name: 'plus diff is logged with plus(+) prefix and green(32) color',
    received: {},
    expected: { plus: 'plusValue' },
    changes: [
      { type: '0', value: `{` },
      { type: '-', value: `  "plus": "plusValue",` },
      { type: '0', value: `}` },
    ],
  },

  {
    name: 'multiple line minus diff is indented correctly',
    received: { nested: { minus: 'minusValue' } },
    expected: {},
    changes: [
      { type: '0', value: `{` },
      { type: '+', value: `  "nested": {` },
      { type: '+', value: `    "minus": "minusValue",` },
      { type: '+', value: `  },` },
      { type: '0', value: `}` },
    ],
  },

  {
    name: 'multiple line plus diff is indented correctly',
    received: {},
    expected: { nested: { plus: 'plusValue' } },
    changes: [
      { type: '0', value: `{` },
      { type: '-', value: `  "nested": {` },
      { type: '-', value: `    "plus": "plusValue",` },
      { type: '-', value: `  },` },
      { type: '0', value: `}` },
    ],
  },

  {
    name: 'nested array diff has correct comma',
    received: [['minusValue']],
    expected: [],
    changes: [
      { type: '0', value: `[` },
      { type: '+', value: `  [` },
      { type: '+', value: `    "minusValue",` },
      { type: '+', value: `  ],` },
      { type: '0', value: `]` },
    ],
  },

  {
    name: 'can use undefined in received',
    received: { minus: 'minusValue' },
    expected: undefined,
    changes: [
      { type: '-', value: `undefined` },
      { type: '+', value: `{` },
      { type: '+', value: `  "minus": "minusValue",` },
      { type: '+', value: `}` },
    ],
  },

  {
    name: 'can use undefined in expected',
    received: undefined,
    expected: { plus: 'plusValue' },
    changes: [
      { type: '-', value: `{` },
      { type: '-', value: `  "plus": "plusValue",` },
      { type: '-', value: `}` },
      { type: '+', value: `undefined` },
    ],
  },

  {
    name: 'can differentiate received undefined and expected string "undefined"',
    received: 'undefined',
    expected: undefined,
    changes: [
      { type: '-', value: `undefined` },
      { type: '+', value: `"undefined"` },
    ],
  },

  {
    name: 'can differentiate received string "undefined" and expected undefined',
    received: undefined,
    expected: 'undefined',
    changes: [
      { type: '-', value: `"undefined"` },
      { type: '+', value: `undefined` },
    ],
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
