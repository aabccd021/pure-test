import type { SuiteError } from '@src';
import { assert, runTests, test } from '@src';
import { either, readonlyArray, task, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';

type Case = {
  readonly name: string;
  readonly received: unknown;
  readonly expected: unknown;
  readonly errorPath: readonly string[];
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
        assert.equalDeepPartial<SuiteError>({
          code: 'TestRunError',
          results: [
            either.left({
              name: 'foo',
              value: {
                code: 'TestError',
                value: { code: 'SerializationError' as const, path: tc.errorPath },
              },
            }),
          ],
        })
      )
    ),
  });

const cases: readonly Case[] = [
  {
    name: 'should return left when comparing function inside path on received',
    received: { path1: () => 'foo' },
    expected: {},
    errorPath: ['path1'],
  },

  {
    name: 'should return left when comparing function inside path on expected',
    received: {},
    expected: { path1: () => 'foo' },
    errorPath: ['path1'],
  },

  {
    name: 'should return left when comparing function on received',
    received: () => 'foo',
    expected: {},
    errorPath: [],
  },

  {
    name: 'should return left when comparing function on expected',
    received: {},
    expected: () => 'foo',
    errorPath: [],
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
