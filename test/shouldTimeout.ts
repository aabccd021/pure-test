import { either, readonlyArray, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import { runTests, test } from '../src';
import { testW } from '../src/test';

const caseToTest = (p: {
  readonly name: string;
  readonly shouldTimeout: true | undefined;
  readonly testPass: boolean;
}) =>
  test({
    name: p.name,
    act: pipe(
      [
        testW({
          name: 'foo',
          shouldTimeout: p.shouldTimeout,
          act: task.delay(1000)(task.of(undefined)),
          assert: undefined,
          timeout: 500,
        }),
      ],
      runTests({}),
      task.map(either.isRight)
    ),
    assert: p.testPass,
  });

const cases = [
  {
    name: 'Timed out test should pass when `shouldTimeout` is true',
    shouldTimeout: true as const,
    testPass: true,
  },
  {
    name: 'Timed out test should fail by default',
    shouldTimeout: undefined,
    testPass: false,
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
