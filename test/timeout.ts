import type { SuiteResult } from '@src';
import { assert, runTests, test } from '@src';
import { either, readonlyArray, task, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import type { DeepPartial } from 'ts-essentials';

type Case = {
  readonly name: string;
  readonly testTime: number;
  readonly testError: DeepPartial<SuiteResult>;
};

const timeoutTime = 500;
const timeoutTestTime = 1000;
const nonTimeoutTestTime = 0;

const caseToTest = (tc: Case) =>
  test.single({
    name: tc.name,
    act: pipe(
      taskEither.right([
        test.single({
          name: 'foo test',
          act: pipe('foo', task.of, task.delay(tc.testTime), assert.task(assert.equal('foo'))),
          timeout: timeoutTime,
        }),
      ]),
      runTests({}),
      assert.task(assert.partial(tc.testError))
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
