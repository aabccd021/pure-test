import type { SuiteResult } from '@src';
import { assert, runTests, test } from '@src';
import { either, readonlyArray, task, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';

type Case = {
  readonly name: string;
  readonly testTime: number;
  readonly testError: SuiteResult;
};

const timeoutTime = 500;
const timeoutTestTime = 1000;
const nonTimeoutTestTime = 0;

const caseToTest = (tc: Case) =>
  test({
    name: tc.name,
    act: pipe(
      taskEither.right([
        test({
          name: 'foo test',
          act: pipe('foo', task.of, task.delay(tc.testTime), task.map(assert.equal('foo'))),
          timeout: timeoutTime,
        }),
      ]),
      runTests({}),
      task.map(assert.equal(tc.testError))
    ),
  });

const cases: readonly Case[] = [
  {
    name: 'Timed out test should return timed out error',
    testTime: timeoutTestTime,
    testError: either.left({
      type: 'TestError',
      results: [either.left({ name: 'foo test', error: { code: 'timed out' } })],
    }),
  },
  {
    name: 'Non timed out test should pass',
    testTime: nonTimeoutTestTime,
    testError: either.right([{ name: 'foo test' }]),
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
