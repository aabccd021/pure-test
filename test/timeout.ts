import { either, readonlyArray, task, taskEither } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';

import { runTests } from '../src';
import { test } from '../src/test';
import type { TestError } from '../src/type';

type Case = {
  readonly name: string;
  readonly testTime: number;
  readonly result: Either<readonly TestError[], undefined>;
};

const caseToTest = (c: Case) =>
  test({
    name: c.name,
    act: pipe(
      [
        test({
          name: 'foo',
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
    name: 'Timed out test should return timed out error',
    testTime: 1000, // should time out
    result: either.left([{ code: 'timed out' as const }]),
  },
  {
    name: 'Non timed out test should pass',
    testTime: 0, // should not time out
    result: either.right(undefined),
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
