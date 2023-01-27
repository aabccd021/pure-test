import { assert, postTest, runTests, test } from '@src';
import { ioRef, readonlyArray, task, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';

const caseToTest = (tc: {
  readonly name: string;
  readonly received: string;
  readonly exitCode: number | undefined;
}) =>
  test({
    name: tc.name,
    act: pipe(
      task.fromIO(ioRef.newIORef<number | undefined>(undefined)),
      task.chainFirst((exitCodeRef) =>
        pipe(
          taskEither.right([
            test({ name: 'tesnNme', act: pipe(tc.received, assert.equal('foo'), task.of) }),
          ]),
          runTests({}),
          postTest.exit({ exit: exitCodeRef.write })
        )
      ),
      task.chainIOK((exitCodeRef) => exitCodeRef.read),
      assert.task(assert.equal(tc.exitCode))
    ),
  });

const cases = [
  { name: 'Exit with code 1 on test fail', received: 'bar', exitCode: 1 },
  { name: 'Exit with code 0 on test pass', received: 'foo', exitCode: 0 },
];

export const tests = readonlyArray.map(caseToTest)(cases);
