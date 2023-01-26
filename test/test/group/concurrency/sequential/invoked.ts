import { assert, group, runTests, test } from '@src';
import { ioRef, readonlyArray, task, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';

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
          taskEither.right([
            group({
              name: 'sequential group test',
              concurrency: { type: 'sequential', failFast: tc.failFast },
              tests: [
                test({ name: 'should pass', act: pipe('foo', assert.equal('foo'), task.of) }),
                test({ name: 'should fail', act: pipe('foo', assert.equal('bar'), task.of) }),
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
            }),
          ]),
          runTests({ concurrency: { type: 'sequential', failFast: tc.failFast } })
        )
      ),
      task.chainIOK((isLastTestExecutedRef) => isLastTestExecutedRef.read),
      assert.task(assert.equal(tc.isLastTestExecuted))
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
