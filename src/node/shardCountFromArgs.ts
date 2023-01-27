import * as util from 'node:util';

import { either, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';
import type { GetShardCount } from 'src/index';
import { ShardingError } from 'src/index';

export const shardCountFromArgs: GetShardCount = pipe(
  util.parseArgs({ options: { shardCount: { type: 'string' } } }),
  ({ values: { shardCount } }) => shardCount,
  either.fromNullable(ShardingError.Union.as.ShardCountIsUnspecified({})),
  either.chainW((shardCountStr) =>
    pipe(
      shardCountStr,
      std.number.fromString,
      either.fromOption(() =>
        ShardingError.Union.as.ShardCountIsNotANumber({ value: shardCountStr })
      )
    )
  ),
  task.of
);
