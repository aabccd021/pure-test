import * as util from 'node:util';

import { either } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';

export const shardCountFromArgs = pipe(
  util.parseArgs({ options: { shardCount: { type: 'string' } } }),
  ({ values: { shardCount } }) => shardCount,
  either.fromNullable('shardCount is unspecified in command line args'),
  either.chain((shardCountStr) =>
    pipe(
      shardCountStr,
      std.number.fromString,
      either.fromOption(() => `shardCount is not a number: "${shardCountStr}"`)
    )
  )
);
