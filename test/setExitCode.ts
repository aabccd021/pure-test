import { readonlyArray, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import { runTests, setExitCodeF, test } from '../src';
import type { Env } from '../src/setExitCodeF';
import { testW } from '../src/test';

const caseToTest = (p: {
  readonly name: string;
  readonly actual: string;
  readonly expected: string;
  readonly exitCode: number;
}) =>
  test({
    name: p.name,
    act: pipe(
      task.of<Env>({ process: { exitCode: undefined } }),
      task.chainFirst((env) =>
        pipe(
          [
            testW({
              name: 'foo',
              act: task.of(p.actual),
              assert: p.expected,
            }),
          ],
          runTests({}),
          setExitCodeF(env)
        )
      )
    ),
    assert: { process: { exitCode: p.exitCode } },
  });

const cases = [
  {
    name: 'Set exit code to 1 on test fail',
    actual: 'foo',
    expected: 'bar',
    exitCode: 1,
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
