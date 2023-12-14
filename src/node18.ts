import * as fs from 'node:fs/promises';
import * as process from 'node:process';
import * as util from 'node:util';

import { taskEither, taskOption } from 'fp-ts';
import { identity, pipe } from 'fp-ts/function';
import type { Env } from 'src/index/type';

export const env: Env = {
  writeStringToFile: ({ path, value }) =>
    taskEither.tryCatch(() => fs.writeFile(path, value, { encoding: 'utf8' }), identity),

  readFileAsString: ({ path }) =>
    taskEither.tryCatch(() => fs.readFile(path, { encoding: 'utf8' }), identity),

  getShardCountFromArgs: pipe(
    util.parseArgs({ options: { shardCount: { type: 'string' } } }),
    ({ values: { shardCount } }) => shardCount,
    taskOption.fromNullable
  ),

  getShardIndexFromArgs: pipe(
    util.parseArgs({ options: { shardIndex: { type: 'string' } } }),
    ({ values: { shardIndex } }) => shardIndex,
    taskOption.fromNullable
  ),
  exit: (exitCode) => () => process.exit(exitCode),
};
