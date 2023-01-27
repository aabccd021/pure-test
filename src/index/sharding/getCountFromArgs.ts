import type { GetShardCount, GetShardCountFromArgs } from '@src';
import { ShardingError } from '@src';
import { either, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';

export const getCountFromArgs = (provider: GetShardCountFromArgs): GetShardCount =>
  pipe(
    provider,
    taskEither.fromTaskOption(() => ShardingError.Union.as.ShardCountIsUnspecified({})),
    taskEither.chainEitherKW((shardCountStr) =>
      pipe(
        shardCountStr,
        std.number.fromString,
        either.fromOption(() =>
          ShardingError.Union.as.ShardCountIsNotANumber({ value: shardCountStr })
        )
      )
    )
  );
