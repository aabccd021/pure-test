import { readonlyArray, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import type { ShardingStrategy } from '../type';

export const chunks: ShardingStrategy = ({ shardCount, tests }) =>
  pipe(tests, readonlyArray.chunksOf(readonlyArray.size(tests) / shardCount), taskEither.right);
