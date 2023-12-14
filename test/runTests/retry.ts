import type { SuiteResult } from '@src';
import { assert, runTests, test } from '@src';
import { either, io, ioRef, readonlyArray, task, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import type { RetryPolicy } from 'retry-ts';
import { limitRetries } from 'retry-ts';
import type { DeepPartial } from 'ts-essentials';

type TestCase = {
  readonly name: string;
  readonly retry?: RetryPolicy;
  readonly result: DeepPartial<SuiteResult>;
};

const caseToTest = (tc: TestCase) =>
  test({
    name: tc.name,
    act: pipe(
      taskEither.fromIO(ioRef.newIORef(0)),
      taskEither.chain((runCountRef) =>
        taskEither.right([
          test({
            name: 'should pass on 3rd try',
            act: pipe(
              runCountRef.modify((x) => x + 1),
              io.chain(() => runCountRef.read),
              io.map(assert.equal(3)),
              task.fromIO
            ),
            retry: tc.retry,
          }),
        ])
      ),
      runTests({}),
      assert.task(assert.equalDeepPartial(tc.result))
    ),
  });

const cases: readonly TestCase[] = [
  {
    name: 'test should fail when retry unspecified',
    retry: undefined,
    result: either.left({
      code: 'TestRunError',
      results: [
        either.left({
          name: 'should pass on 3rd try',
          value: { code: 'TestError', value: { code: 'AssertionError', received: 1 } },
        }),
      ],
    }),
  },

  {
    name: 'test should fail when limit retry 0',
    retry: limitRetries(0),
    result: either.left({
      code: 'TestRunError',
      results: [
        either.left({
          name: 'should pass on 3rd try',
          value: { code: 'TestError', value: { code: 'AssertionError', received: 1 } },
        }),
      ],
    }),
  },

  {
    name: 'test should fail when limit retry 1',
    retry: limitRetries(1),
    result: either.left({
      code: 'TestRunError',
      results: [
        either.left({
          name: 'should pass on 3rd try',
          value: { code: 'TestError', value: { code: 'AssertionError', received: 2 } },
        }),
      ],
    }),
  },

  {
    name: 'test should pass when limit retry 2',
    retry: limitRetries(2),
    result: either.right([{ name: 'should pass on 3rd try' }]),
  },

  {
    name: 'test should pass when limit retry 3',
    retry: limitRetries(3),
    result: either.right([{ name: 'should pass on 3rd try' }]),
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
