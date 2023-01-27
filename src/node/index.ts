import * as fs from 'node:fs/promises';
import * as util from 'node:util';

import type {
  GetShardCountFromArgs,
  GetShardIndexFromArgs,
  ReadFileAsString,
  WriteStringToFile,
} from '@src';
import { taskEither, taskOption } from 'fp-ts';
import { identity, pipe } from 'fp-ts/function';

export * as postTest from './postTest';

export const writeStringToFile: WriteStringToFile = ({ path, value }) =>
  taskEither.tryCatch(() => fs.writeFile(path, value, { encoding: 'utf8' }), identity);

export const readFileAsString: ReadFileAsString = ({ path }) =>
  taskEither.tryCatch(() => fs.readFile(path, { encoding: 'utf8' }), identity);

export const getShardCountFromArgs: GetShardCountFromArgs = pipe(
  util.parseArgs({ options: { shardCount: { type: 'string' } } }),
  ({ values: { shardCount } }) => shardCount,
  taskOption.fromNullable
);

export const getShardIndexFromArgs: GetShardIndexFromArgs = pipe(
  util.parseArgs({ options: { shardIndex: { type: 'string' } } }),
  ({ values: { shardIndex } }) => shardIndex,
  taskOption.fromNullable
);
