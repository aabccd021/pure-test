import { ioRef, readonlyArray, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import { assert, runTests, test } from '../../../src';

type TestCase = {
  readonly name: string;
  readonly failFast: false | undefined;
  readonly isLastTestExecuted: boolean;
};

const caseToTest = (tc: TestCase) =>
  test({
    name: tc.name,
    act: pipe(
      task.fromIO(ioRef.newIORef(false)),
      task.chainFirst((isLastTestExecutedRef) =>
        pipe(
          [
            test({
              name: 'should pass',
              act: pipe('foo', assert.equal('foo'), task.of),
            }),
            test({
              name: 'should fail',
              act: pipe('foo', assert.equal('bar'), task.of),
            }),
            test({
              name: 'should skip',
              act: pipe(
                'foo',
                assert.equal('foo'),
                task.of,
                task.chainFirstIOK(() => isLastTestExecutedRef.write(true))
              ),
            }),
          ],
          runTests({
            concurrency: {
              type: 'sequential',
              failFast: tc.failFast,
            },
          })
        )
      ),
      task.chainIOK((isLastTestExecutedRef) => isLastTestExecutedRef.read),
      task.map(assert.equal(tc.isLastTestExecuted))
    ),
  });

const cases: readonly TestCase[] = [
  {
    name: 'test after failed test should not be executed if fail fast',
    failFast: undefined,
    isLastTestExecuted: false,
  },
  {
    name: 'test after failed test should be executed if not fail fast',
    failFast: false,
    isLastTestExecuted: true,
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);