import { either, readonlyArray, taskEither, taskEither as TE } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type { TaskEither } from 'fp-ts/TaskEither';

import type { GetShardCount, GetShardIndex, Named, ShardingStrategy, TestUnit } from '../type';
import { ShardingError, SuiteError } from '../type';

const getShardOnIndex =
  (index: number) =>
  (
    shards: readonly (readonly Named<TestUnit.Union>[])[]
  ): Either<ShardingError['ShardIndexOutOfBound'], readonly Named<TestUnit.Union>[]> =>
    pipe(
      shards,
      readonlyArray.lookup(index - 1),
      either.fromOption(() =>
        ShardingError.Union.as.ShardIndexOutOfBound({
          index,
          shardCount: readonlyArray.size(shards),
        })
      )
    );

const validateTestShards = (tests: {
  readonly beforeSharding: readonly Named<TestUnit.Union>[];
  readonly afterSharding: readonly (readonly Named<TestUnit.Union>[])[];
}): Either<
  ShardingError['TestCountChangedAfterSharding'],
  readonly (readonly Named<TestUnit.Union>[])[]
> =>
  pipe(
    {
      beforeSharding: readonlyArray.size(tests.beforeSharding),
      afterSharding: pipe(tests.afterSharding, readonlyArray.flatten, readonlyArray.size),
    },
    (testCount) =>
      testCount.afterSharding === testCount.beforeSharding
        ? either.right(tests.afterSharding)
        : either.left(ShardingError.Union.as.TestCountChangedAfterSharding({ testCount }))
  );

export const shardTests = <L>(p: {
  readonly index: GetShardIndex;
  readonly count: GetShardCount;
  readonly strategy: ShardingStrategy;
}): ((
  tests: TaskEither<L, readonly Named<TestUnit.Union>[]>
) => TaskEither<L | SuiteError['ShardingError'], readonly Named<TestUnit.Union>[]>) =>
  taskEither.chainW((tests) =>
    pipe(
      TE.Do,
      TE.bindW('count', () => p.count),
      TE.bindW('index', () => p.index),
      TE.bindW('testShards', ({ count }) => p.strategy({ shardCount: count, tests })),
      TE.chainEitherKW(({ index, testShards }) =>
        pipe(
          validateTestShards({ beforeSharding: tests, afterSharding: testShards }),
          either.chainW(getShardOnIndex(index))
        )
      ),
      TE.mapLeft((value) => SuiteError.Union.as.ShardingError({ value }))
    )
  );
