import type { AssertEqual, SuiteError, TestError } from '@src';
import { assert, runTests, test } from '@src';
import { either, readonlyArray, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import type { Task } from 'fp-ts/Task';
import type { DeepPartial } from 'ts-essentials';

type Case = {
  readonly name: string;
  readonly act: Task<AssertEqual>;
  readonly testError: DeepPartial<TestError>;
};

const caseToTest = (tc: Case) =>
  test({
    name: tc.name,
    act: pipe(
      taskEither.right([test({ name: 'Unhandled exception test', act: tc.act })]),
      runTests({}),
      assert.taskEitherLeft(
        assert.equalDeepPartial<SuiteError>({
          code: 'TestRunError',
          results: [
            either.left({
              name: 'Unhandled exception test',
              value: { code: 'TestError' as const, value: tc.testError },
            }),
          ],
        })
      )
    ),
  });

const cases: readonly Case[] = [
  {
    name: 'should return UnhandledException when non promise is rejected',
    // eslint-disable-next-line functional/no-promise-reject
    act: () => Promise.reject('baz'),
    testError: {
      code: 'UnhandledException' as const,
      exception: { value: 'baz', serialized: 'baz' },
    },
  },

  {
    name: 'should return UnhandledException when exception is thrown',
    act: async () => {
      // eslint-disable-next-line functional/no-throw-statement
      throw Error('bar');
    },
    testError: {
      code: 'UnhandledException' as const,
      exception: { serialized: { message: 'bar', name: 'Error' } },
    },
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
