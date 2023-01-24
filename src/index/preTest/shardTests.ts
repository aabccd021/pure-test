import { either, readonlyArray, taskEither, taskEither as TE } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type { TaskEither } from 'fp-ts/TaskEither';

import type {
  GetShardCount,
  GetShardIndex,
  ShardingError,
  ShardingStrategy,
  SuiteError,
  Test,
} from '../type';

const getShardOnIndex =
  (index: number) =>
  (
    shards: readonly (readonly Test[])[]
  ): Either<ShardingError.ShardIndexOutOfBound, readonly Test[]> =>
    pipe(
      shards,
      readonlyArray.lookup(index - 1),
      either.fromOption(() => ({
        type: 'ShardIndexOutOfBound',
        index,
        shardCount: readonlyArray.size(shards),
      }))
    );

const validateTestShards = (tests: {
  readonly beforeSharding: readonly Test[];
  readonly afterSharding: readonly (readonly Test[])[];
}): Either<ShardingError.TestCountChangedAfterSharding, readonly (readonly Test[])[]> =>
  pipe(
    {
      beforeSharding: readonlyArray.size(tests.beforeSharding),
      afterSharding: pipe(tests.afterSharding, readonlyArray.flatten, readonlyArray.size),
    },
    (testCount) =>
      testCount.afterSharding === testCount.beforeSharding
        ? either.right(tests.afterSharding)
        : either.left({
            type: 'TestCountChangedAfterSharding',
            testCount,
          })
  );

export const shardTests = (p: {
  readonly index: GetShardIndex;
  readonly count: GetShardCount;
  readonly strategy: ShardingStrategy;
}): ((tests: TaskEither<SuiteError, readonly Test[]>) => TaskEither<SuiteError, readonly Test[]>) =>
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
      TE.mapLeft((value) => ({ type: 'ShardingError' as const, value }))
    )
  );
