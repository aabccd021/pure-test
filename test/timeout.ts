import { either, option, readonlyArray, task, taskEither, taskOption } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import type { Option } from 'fp-ts/Option';

import { assert, runTests, test } from '../src';
import type { TestError } from '../src/type';

type Case = {
  readonly name: string;
  readonly testTime: number;
  readonly testError: Option<TestError>;
};

const timeoutTime = 500;
const timeoutTestTime = 1000;
const nonTimeoutTestTime = 0;

const caseToTest = (tc: Case) =>
  test({
    name: tc.name,
    act: pipe(
      [
        test({
          name: 'foo',
          act: pipe('foo', task.of, task.delay(tc.testTime), task.map(assert.equal('foo'))),
          timeout: timeoutTime,
        }),
      ],
      runTests({}),
      taskEither.match(
        (suiteError) =>
          suiteError.type === 'TestError' ? readonlyArray.head(suiteError.results) : option.none,
        () => option.none
      ),
      taskOption.chainOptionK(
        either.match(
          ({ error }) => option.some(error),
          () => option.none
        )
      ),
      task.map(assert.equal(tc.testError))
    ),
  });

const cases: readonly Case[] = [
  {
    name: 'Timed out test should return timed out error',
    testTime: timeoutTestTime,
    testError: option.some({ code: 'timed out' as const }),
  },
  {
    name: 'Non timed out test should pass',
    testTime: nonTimeoutTestTime,
    testError: option.none,
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
