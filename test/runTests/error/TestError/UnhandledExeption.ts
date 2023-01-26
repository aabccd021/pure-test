import type { SuiteError } from '@src';
import { assert, runTests, test } from '@src';
import { either, readonlyArray, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import type { Task } from 'fp-ts/Task';

type Case = {
  readonly name: string;
  readonly received: Task<string>;
  readonly exception: unknown;
};

const caseToTest = (tc: Case) =>
  test({
    name: tc.name,
    act: pipe(
      taskEither.right([
        test({ name: 'foo', act: pipe(tc.received, assert.task(assert.equal('foo'))) }),
      ]),
      runTests({}),
      assert.taskEitherLeft(
        assert.equal<SuiteError.Union>({
          code: 'TestRunError',
          results: [
            either.left({
              name: 'foo',
              value: {
                code: 'TestError',
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
    name: 'should return UnhandledException when unhandled exception is thrown',
    // eslint-disable-next-line functional/no-promise-reject
    received: () => Promise.reject('bar'),
    exception: 'bar',
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
