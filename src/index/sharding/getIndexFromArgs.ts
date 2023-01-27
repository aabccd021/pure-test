import type { GetShardIndex, GetShardIndexFromArgs } from '@src';
import { ShardingError } from '@src';
import { either, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';

export const getIndexFromArgs = (provider: GetShardIndexFromArgs): GetShardIndex =>
  pipe(
    provider,
    taskEither.fromTaskOption(() => ShardingError.as.ShardIndexIsUnspecified({})),
    taskEither.chainEitherKW((shardIndexStr) =>
      pipe(
        shardIndexStr,
        std.number.fromString,
        either.fromOption(() => ShardingError.as.ShardIndexIsNotANumber({ value: shardIndexStr }))
      )
    )
  );
