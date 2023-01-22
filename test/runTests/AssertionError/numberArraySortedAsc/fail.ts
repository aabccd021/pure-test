import type { Change, SuiteError } from '@src';
import { assert, runTests, test } from '@src';
import { either, readonlyArray, task, taskEither } from 'fp-ts';
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
      assert.taskEitherLeft(
        assert.equal<SuiteError>({
          type: 'TestError',
          results: [
            either.left({
              name: 'foo',
              error: {
                code: 'AssertionError',
                received: tc.received,
                expected: tc.expected,
                changes: tc.changes,
              },
            }),
          ],
        })
      )
    ),
  });

const cases: readonly Case[] = [
  {
    name: 'non-sorted array has changes',
    received: [3, 1, 2],
    expected: [1, 2, 3],
    changes: [
      { type: '0', value: `[` },
      { type: '+', value: `  3,` },
      { type: '0', value: `  1,` },
      { type: '0', value: `  2,` },
      { type: '-', value: `  3,` },
      { type: '0', value: `]` },
    ],
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
