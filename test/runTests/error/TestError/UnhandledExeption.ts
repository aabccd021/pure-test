import type { Assert, SuiteError, TestError } from '@src';
import { assert, runTests, test } from '@src';
import { either, readonlyArray, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import type { Task } from 'fp-ts/Task';
import type { DeepPartial } from 'ts-essentials';

type Case = {
  readonly name: string;
  readonly act: Task<Assert.Union>;
  readonly exception: DeepPartial<TestError['UnhandledException']['exception']>;
};

const caseToTest = (tc: Case) =>
  test({
    name: tc.name,
    act: pipe(
      taskEither.right([test({ name: 'Unhandled exception test', act: tc.act })]),
      runTests({}),
      assert.taskEitherLeft(
        assert.equalDeepPartial<SuiteError['Union']>({
          code: 'TestRunError',
          results: [
            either.left({
              name: 'Unhandled exception test',
              value: {
                code: 'TestError' as const,
                value: { code: 'UnhandledException' as const, exception: tc.exception },
              },
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
    exception: { value: 'baz', serialized: 'baz' },
  },

  {
    name: 'should return UnhandledException when exception is thrown',
    act: async () => {
      // eslint-disable-next-line functional/no-throw-statement
      throw Error('bar');
    },
    exception: { serialized: { message: 'bar', name: 'Error' } },
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
