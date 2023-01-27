import type { Env, GetShardCount } from '@src';
import { ShardingError } from '@src';
import { either, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';

export const getCountFromArgs = (env: Pick<Env, 'getShardCountFromArgs'>): GetShardCount =>
  pipe(
    env.getShardCountFromArgs,
    taskEither.fromTaskOption(() => ShardingError.as.ShardCountIsUnspecified({})),
    taskEither.chainEitherKW((shardCountStr) =>
      pipe(
        shardCountStr,
        std.number.fromString,
        either.fromOption(() => ShardingError.as.ShardCountIsNotANumber({ value: shardCountStr }))
      )
    )
  );
