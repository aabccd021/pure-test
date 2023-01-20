import { either, readonlyArray, task, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import type { AssertionError } from '../../../src';
import { assert, runTests, test } from '../../../src';

type TestCase = {
  readonly name: string;
  readonly failFast: false | undefined;
  readonly errorCodeAfterFailedTest: AssertionError['code'];
};

const caseToTest = (tc: TestCase) =>
  test({
    name: tc.name,
    act: pipe(
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
          act: pipe('foo', assert.equal('bar'), task.of),
        }),
      ],
      runTests({
        concurrency: {
          type: 'sequential',
          failFast: tc.failFast,
        },
      }),
      taskEither.mapLeft(
        readonlyArray.map(either.mapLeft((res) => ({ name: res.name, errorCode: res.error.code })))
      ),
      assert.taskEitherLeftAnd(
        assert.equalArrayW([
          either.right({
            name: 'should pass',
          }),
          either.left({
            name: 'should fail',
            errorCode: 'AssertionError',
          }),
          either.left({
            name: 'should skip',
            errorCode: tc.errorCodeAfterFailedTest,
          }),
        ])
      )
    ),
  });

const cases: readonly TestCase[] = [
  {
    name: 'fail fast sequential should skip test after failing',
    failFast: undefined,
    errorCodeAfterFailedTest: 'Skipped',
  },
  {
    name: 'non fail fast sequential should run all tests',
    failFast: false,
    errorCodeAfterFailedTest: 'AssertionError',
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
