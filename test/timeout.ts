import { either, readonlyArray, task } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { flow, pipe } from 'fp-ts/function';

import { assert, runTests, test } from '../src';
import type { TestError } from '../src/type';

type Case = {
  readonly name: string;
  readonly testTime: number;
  readonly result: Either<TestError, undefined>;
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
      task.map(
        flow(
          readonlyArray.map(
            either.bimap(
              ({ error }) => error,
              () => undefined
            )
          ),
          assert.equalArray([tc.result])
        )
      )
    ),
  });

const cases: readonly Case[] = [
  {
    name: 'Timed out test should return timed out error',
    testTime: timeoutTestTime,
    result: either.left({ code: 'timed out' as const }),
  },
  {
    name: 'Non timed out test should pass',
    testTime: nonTimeoutTestTime,
    result: either.right(undefined),
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
