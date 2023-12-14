import type { Named, TestUnitSuccess } from '@src';
import { assert, preTest, runTests, sharding, test } from '@src';
import { readonlyArray, readonlyNonEmptyArray, task, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import type { ReadonlyNonEmptyArray } from 'fp-ts/ReadonlyNonEmptyArray';
import type { DeepPartial } from 'ts-essentials';

type TestCase = {
  readonly shardCount: number;
  readonly result: ReadonlyNonEmptyArray<readonly DeepPartial<Named<TestUnitSuccess>>[]>;
};

const caseToTest = (tc: TestCase) =>
  test({
    name: `shardCount: ${tc.shardCount}`,
    act: pipe(
      readonlyNonEmptyArray.range(1, tc.shardCount),
      readonlyNonEmptyArray.traverse(taskEither.ApplicativePar)((shardIndex) =>
        pipe(
          taskEither.right([
            test({ name: '01', act: pipe('foo', assert.equal('foo'), task.of) }),
            test({ name: '02', act: pipe('foo', assert.equal('foo'), task.of) }),
            test({ name: '03', act: pipe('foo', assert.equal('foo'), task.of) }),
            test({ name: '04', act: pipe('foo', assert.equal('foo'), task.of) }),
            test({ name: '05', act: pipe('foo', assert.equal('foo'), task.of) }),
            test({ name: '06', act: pipe('foo', assert.equal('foo'), task.of) }),
            test({ name: '07', act: pipe('foo', assert.equal('foo'), task.of) }),
            test({ name: '08', act: pipe('foo', assert.equal('foo'), task.of) }),
            test({ name: '09', act: pipe('foo', assert.equal('foo'), task.of) }),
            test({ name: '10', act: pipe('foo', assert.equal('foo'), task.of) }),
          ]),
          preTest.shardTests({
            index: taskEither.of(shardIndex),
            count: taskEither.of(tc.shardCount),
            strategy: sharding.strategy.chunks,
          }),
          runTests({})
        )
      ),
      assert.taskEither(assert.equalDeepPartial(tc.result))
    ),
  });

const cases: readonly TestCase[] = [
  {
    shardCount: 1,
    result: [
      [
        { name: '01' },
        { name: '02' },
        { name: '03' },
        { name: '04' },
        { name: '05' },
        { name: '06' },
        { name: '07' },
        { name: '08' },
        { name: '09' },
        { name: '10' },
      ],
    ],
  },

  {
    shardCount: 2,
    result: [
      [{ name: '01' }, { name: '02' }, { name: '03' }, { name: '04' }, { name: '05' }],
      [{ name: '06' }, { name: '07' }, { name: '08' }, { name: '09' }, { name: '10' }],
    ],
  },

  {
    shardCount: 5,
    result: [
      [{ name: '01' }, { name: '02' }],
      [{ name: '03' }, { name: '04' }],
      [{ name: '05' }, { name: '06' }],
      [{ name: '07' }, { name: '08' }],
      [{ name: '09' }, { name: '10' }],
    ],
  },

  {
    shardCount: 10,
    result: [
      [{ name: '01' }],
      [{ name: '02' }],
      [{ name: '03' }],
      [{ name: '04' }],
      [{ name: '05' }],
      [{ name: '06' }],
      [{ name: '07' }],
      [{ name: '08' }],
      [{ name: '09' }],
      [{ name: '10' }],
    ],
  },
];

export const tests = readonlyArray.map(caseToTest)(cases);
