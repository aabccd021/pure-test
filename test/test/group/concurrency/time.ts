import type { Concurrency } from '@src';
import { assert, runTests, test } from '@src';
import { option, readonlyArray, task, taskEither } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';

type TestCase = {
  readonly name: string;
  readonly concurrency: Concurrency;
  readonly expectedTotalElapsedTimeMs: number;
};

const caseToTest = (tc: TestCase) =>
  test.single({
    name: tc.name,
    act: pipe(
      taskEither.right([
        test.group({
          name: 'sequential group concurrency time test',
          concurrency: tc.concurrency,
          asserts: [
            test.single({
              name: 'delay 1s',
              act: pipe('foo', assert.equal('foo'), task.of, task.delay(1000)),
            }),
            test.single({
              name: 'delay 1s',
              act: pipe('foo', assert.equal('foo'), task.of, task.delay(1000)),
            }),
            test.single({
              name: 'delay 1s',
              act: pipe('foo', assert.equal('foo'), task.of, task.delay(1000)),
            }),
          ],
        }),
      ]),
      runTests({}),
      task.map(
        flow(
          option.fromEither,
          option.chain(
            flow(
              readonlyArray.head,
              option.map(({ timeElapsedMs }) => timeElapsedMs)
            )
          ),
          option.getOrElse(() => -1)
        )
      ),
      assert.task((totalTimeElapsedMs) =>
        assert.numberArrayIsSortedAsc([
          tc.expectedTotalElapsedTimeMs - 100,
          totalTimeElapsedMs,
          tc.expectedTotalElapsedTimeMs + 100,
        ])
      )
    ),
  });

const cases: readonly TestCase[] = [
  {
    name: 'total elapsed run in parallel',
    concurrency: { type: 'parallel' },
    expectedTotalElapsedTimeMs: 1000,
  },
  {
    name: 'total elapsed run in sequential',
    concurrency: { type: 'sequential' },
    expectedTotalElapsedTimeMs: 3000,
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
