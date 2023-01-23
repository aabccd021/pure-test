import * as util from 'node:util';

import { either, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';
import type { GetShardIndex } from 'src/index';

export const shardIndexFromArgs: GetShardIndex = pipe(
  util.parseArgs({ options: { shardIndex: { type: 'string' } } }),
  ({ values: { shardIndex } }) => shardIndex,
  either.fromNullable('shardIndex is unspecified in command line args'),
  either.chain((shardIndexStr) =>
    pipe(
      shardIndexStr,
      std.number.fromString,
      either.fromOption(() => `shardIndex is not a number: "${shardIndexStr}"`)
    )
  ),
  task.of
);
