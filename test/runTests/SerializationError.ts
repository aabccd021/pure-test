import { either, readonlyArray, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import { assert, runTests, test } from '../../src';

type Case = {
  readonly name: string;
  readonly actual: unknown;
  readonly expected: unknown;
  readonly errorPath: readonly string[];
};

const caseToTest = (tc: Case) =>
  test({
    name: tc.name,
    act: pipe(
      [
        test({
          name: 'foo',
          act: pipe(tc.actual, assert.equal(tc.expected), task.of),
        }),
      ],
      runTests({}),
      assert.taskEitherLeftAnd(
        assert.equalArrayW([
          either.left({
            name: 'foo',
            error: {
              code: 'SerializationError' as const,
              path: tc.errorPath,
            },
          }),
        ])
      )
    ),
  });

const cases: readonly Case[] = [
  {
    name: 'should return left when comparing function inside path on actual',
    actual: { path1: () => 'foo' },
    expected: {},
    errorPath: ['path1'],
  },

  {
    name: 'should return left when comparing function inside path on expected',
    actual: {},
    expected: { path1: () => 'foo' },
    errorPath: ['path1'],
  },

  {
    name: 'should return left when comparing function on actual',
    actual: () => 'foo',
    expected: {},
    errorPath: [],
  },

  {
    name: 'should return left when comparing function on expected',
    actual: {},
    expected: () => 'foo',
    errorPath: [],
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);