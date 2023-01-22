import type { Change } from '@src';
import { assert, runTests, test } from '@src';
import { readonlyArray, task, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';

type Case = {
  readonly name: string;
  readonly received: readonly number[];
  readonly expected: readonly number[];
  readonly changes: readonly Change[];
};

const caseToTest = (tc: Case) =>
  test({
    name: tc.name,
    act: pipe(
      taskEither.right([
        test({ name: 'foo', act: pipe(tc.received, assert.numberArraySortedAsc, task.of) }),
      ]),
      runTests({}),
      assert.taskEither(assert.equalArray([{ name: 'foo' }]))
    ),
  });

const cases: readonly Case[] = [
  {
    name: 'empty array is equal',
    received: [],
    expected: [],
    changes: [
      { type: '0', value: `[` },
      { type: '0', value: `]` },
    ],
  },

  {
    name: 'sorted array has no changes',
    received: [1, 2, 3],
    expected: [1, 2, 3],
    changes: [
      { type: '0', value: `[` },
      { type: '-', value: `  1,` },
      { type: '-', value: `  2,` },
      { type: '-', value: `  3,` },
      { type: '0', value: `]` },
    ],
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
