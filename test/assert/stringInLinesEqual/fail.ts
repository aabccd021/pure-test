import type { Change, SuiteError } from '@src';
import { assert, runTests, test } from '@src';
import { either, readonlyArray, task, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';

type Case = {
  readonly name: string;
  readonly received: string;
  readonly expected: readonly string[];
  readonly changes: readonly Change[];
};

const caseToTest = (tc: Case) =>
  test({
    name: tc.name,
    act: pipe(
      taskEither.right([
        test({
          name: 'foo',
          act: pipe(tc.received, assert.stringInLinesEqual(tc.expected), task.of),
        }),
      ]),
      runTests({}),
      assert.taskEitherLeft(
        assert.equalDeepPartial<SuiteError>({
          code: 'TestRunError',
          results: [
            either.left({
              name: 'foo',
              value: {
                code: 'TestError',
                value: { code: 'AssertionError', expected: tc.expected, changes: tc.changes },
              },
            }),
          ],
        })
      )
    ),
  });

const cases: readonly Case[] = [
  {
    name: 'different string',
    received: 'foo',
    expected: ['bar'],
    changes: [
      { type: '0', value: `[` },
      { type: '-', value: `  "bar",` },
      { type: '+', value: `  "foo",` },
      { type: '0', value: `]` },
    ],
  },

  {
    name: 'empty received',
    received: '',
    expected: ['foo'],
    changes: [
      { type: '0', value: `[` },
      { type: '-', value: `  "foo",` },
      { type: '+', value: `  "",` },
      { type: '0', value: `]` },
    ],
  },

  {
    name: 'empty expected',
    received: 'foo',
    expected: [''],
    changes: [
      { type: '0', value: `[` },
      { type: '-', value: `  "",` },
      { type: '+', value: `  "foo",` },
      { type: '0', value: `]` },
    ],
  },

  {
    name: 'empty expected string and empty received array',
    received: '',
    expected: [],
    changes: [
      { type: '0', value: `[` },
      { type: '+', value: `  "",` },
      { type: '0', value: `]` },
    ],
  },

  {
    name: 'string ends with newline',
    received: 'foo\n',
    expected: ['foo'],
    changes: [
      { type: '0', value: `[` },
      { type: '0', value: `  "foo",` },
      { type: '+', value: `  "",` },
      { type: '0', value: `]` },
    ],
  },

  {
    name: 'string starts with newline',
    received: '\nfoo',
    expected: ['foo'],
    changes: [
      { type: '0', value: `[` },
      { type: '+', value: `  "",` },
      { type: '0', value: `  "foo",` },
      { type: '0', value: `]` },
    ],
  },

  {
    name: 'string with consequtive newline',
    received: 'foo\n\nbar',
    expected: ['foo', 'bar'],
    changes: [
      { type: '0', value: `[` },
      { type: '0', value: `  "foo",` },
      { type: '+', value: `  "",` },
      { type: '0', value: `  "bar",` },
      { type: '0', value: `]` },
    ],
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
