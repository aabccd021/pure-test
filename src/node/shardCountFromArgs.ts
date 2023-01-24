import * as util from 'node:util';

import { either, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';
import type { GetShardCount } from 'src/index';

export const shardCountFromArgs: GetShardCount = pipe(
  util.parseArgs({ options: { shardCount: { type: 'string' } } }),
  ({ values: { shardCount } }) => shardCount,
  either.fromNullable({ type: 'ShardCountIsUnspecified' as const }),
  either.chainW((shardCountStr) =>
    pipe(
      shardCountStr,
      std.number.fromString,
      either.fromOption(() => ({ type: 'ShardCountIsNotANumber' as const, value: shardCountStr }))
    )
  ),
  task.of
);
