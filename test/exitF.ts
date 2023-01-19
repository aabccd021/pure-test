import { ioRef, readonlyArray, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import { assert, runTests, test } from '../src';
import { exitF } from '../src/exitF';

const caseToTest = (tc: {
  readonly name: string;
  readonly actual: string;
  readonly exitCode: number | undefined;
}) =>
  test({
    name: tc.name,
    act: pipe(
      task.fromIO(ioRef.newIORef<number | undefined>(undefined)),
      task.chainFirst((exitCodeRef) =>
        pipe(
          [
            test({
              name: 'tesnNme',
              act: pipe(tc.actual, assert.equal('foo'), task.of),
            }),
          ],
          runTests({}),
          exitF({ process: { exit: exitCodeRef.write } })
        )
      ),
      task.chainIOK((exitCodeRef) => exitCodeRef.read),
      task.map(assert.equal(tc.exitCode))
    ),
  });

const cases = [
  {
    name: 'Set exit code to 1 on test fail',
    actual: 'bar',
    exitCode: 1,
  },
  {
    name: 'Dont set exit code on test pass',
    actual: 'foo',
    exitCode: undefined,
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
