import * as util from 'node:util';

import { either, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';
import type { GetShardIndex } from 'src/index';
import { ShardingError } from 'src/index';

export const shardIndexFromArgs: GetShardIndex = pipe(
  util.parseArgs({ options: { shardIndex: { type: 'string' } } }),
  ({ values: { shardIndex } }) => shardIndex,
  either.fromNullable(ShardingError.Union.as.ShardIndexIsUnspecified({})),
  either.chainW((shardIndexStr) =>
    pipe(
      shardIndexStr,
      std.number.fromString,
      either.fromOption(() =>
        ShardingError.Union.as.ShardIndexIsNotANumber({ value: shardIndexStr })
      )
    )
  ),
  task.of
);
