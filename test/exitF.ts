import { ioRef, readonlyArray, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import { runTests, test } from '../src';
import { exitF } from '../src/exitF';
import { testW } from '../src/test';

const caseToTest = (p: {
  readonly name: string;
  readonly actual: string;
  readonly exitCode: number | undefined;
}) =>
  test({
    name: p.name,
    act: pipe(
      task.fromIO(ioRef.newIORef<number | undefined>(undefined)),
      task.chainFirst((exitCodeRef) =>
        pipe(
          [
            testW({
              name: 'tesnNme',
              act: task.of(p.actual),
              assert: 'foo',
            }),
          ],
          runTests({}),
          exitF({ process: { exit: exitCodeRef.write } })
        )
      ),
      task.chainIOK((exitCodeRef) => exitCodeRef.read)
    ),
    assert: p.exitCode,
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
