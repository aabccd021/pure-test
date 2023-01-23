import { apply, either, readonlyArray, taskEither as TE } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import type { TaskEither } from 'fp-ts/TaskEither';

import type { GetShardCount, GetShardIndex, ShardingStrategy, SuiteError, Test } from '../type';

export const shardTests = (p: {
  readonly config: {
    readonly index: GetShardIndex;
    readonly count: GetShardCount;
  };
  readonly strategy: ShardingStrategy;
}): ((res: TaskEither<SuiteError, readonly Test[]>) => TaskEither<SuiteError, readonly Test[]>) =>
  TE.chain((tests) =>
    pipe(
      TE.Do,
      TE.bind('config', () => pipe(p.config, apply.sequenceS(TE.ApplicativePar))),
      TE.bind('testShards', ({ config }) => p.strategy({ shardCount: config.count, tests })),
      TE.chainEitherK(({ config, testShards }) =>
        pipe(
          testShards,
          readonlyArray.lookup(config.index - 1),
          either.fromOption(() => `Shard index is out of bound: ${config.index}`)
        )
      ),
      TE.mapLeft((message): SuiteError => ({ type: 'ShardingError', message }))
    )
  );
