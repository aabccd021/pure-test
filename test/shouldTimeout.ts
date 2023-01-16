import { either, readonlyArray, task, taskEither } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';

import { runTests } from '../src';
import { test } from '../src/test';
import type { AssertionError } from '../src/type';

type Case = {
  readonly name: string;
  readonly testTime: number;
  readonly result: Either<readonly AssertionError[], undefined>;
};

const caseToTest = (c: Case) =>
  test({
    name: c.name,
    act: pipe(
      [
        test({
          name: 'foo',
          shouldTimeout: true,
          act: task.delay(c.testTime)(task.of('foo')),
          assert: 'foo',
          timeout: 500,
        }),
      ],
      runTests({}),
      taskEither.mapLeft(readonlyArray.map(({ error }) => error))
    ),
    assert: c.result,
  });

const cases: readonly Case[] = [
  {
    name: 'Timed out test should pass when `shouldTimeout` is true',
    testTime: 1000, // should time out
    result: either.right(undefined),
  },
  {
    name: 'In-time test should fail when `shouldTimeout` is true',
    testTime: 100, // should not time out
    result: either.left([{ code: 'should be timed out' as const }]),
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
