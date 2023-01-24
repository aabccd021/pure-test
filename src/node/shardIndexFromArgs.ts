import * as util from 'node:util';

import { either, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';
import type { GetShardIndex } from 'src/index';

export const shardIndexFromArgs: GetShardIndex = pipe(
  util.parseArgs({ options: { shardIndex: { type: 'string' } } }),
  ({ values: { shardIndex } }) => shardIndex,
  either.fromNullable({ type: 'ShardIndexIsUnspecified' as const }),
  either.chainW((shardIndexStr) =>
    pipe(
      shardIndexStr,
      std.number.fromString,
      either.fromOption(() => ({ type: 'ShardIndexIsNotANumber' as const, value: shardIndexStr }))
    )
  ),
  task.of
);
