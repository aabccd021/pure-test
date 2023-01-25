import * as util from 'node:util';

import { either, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';
import type { GetShardCount } from 'src/index';

import { shardingError } from '../index/type';

export const shardCountFromArgs: GetShardCount = pipe(
  util.parseArgs({ options: { shardCount: { type: 'string' } } }),
  ({ values: { shardCount } }) => shardCount,
  either.fromNullable(shardingError.shardCountIsUnspecified),
  either.chainW((shardCountStr) =>
    pipe(
      shardCountStr,
      std.number.fromString,
      either.fromOption(() => shardingError.shardCountIsNotANumber(shardCountStr))
    )
  ),
  task.of
);
