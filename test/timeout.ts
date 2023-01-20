import type { TestError } from '@src/index';
import { assert, runTests, test } from '@src/index';
import { either, option, readonlyArray, task, taskEither } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type { Option } from 'fp-ts/Option';

type Case = {
  readonly name: string;
  readonly testTime: number;
  readonly testError: Either<Option<TestError>, undefined>;
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
          name: 'foo',
          act: pipe('foo', task.of, task.delay(tc.testTime), task.map(assert.equal('foo'))),
          timeout: timeoutTime,
        }),
      ]),
      runTests({}),
      taskEither.bimap(
        (suiteError) =>
          suiteError.type === 'TestError'
            ? pipe(
                suiteError.results,
                readonlyArray.head,
                option.chain(
                  either.match(
                    ({ error }) => option.some(error),
                    () => option.none
                  )
                )
              )
            : option.none,
        () => undefined
      ),
      task.map(assert.equal(tc.testError))
    ),
  });

const cases: readonly Case[] = [
  {
    name: 'Timed out test should return timed out error',
    testTime: timeoutTestTime,
    testError: either.left(option.some({ code: 'timed out' as const })),
  },
  {
    name: 'Non timed out test should pass',
    testTime: nonTimeoutTestTime,
    testError: either.right(undefined),
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
