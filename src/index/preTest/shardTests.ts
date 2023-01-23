import { apply, either, option, readonlyArray, taskEither } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type { TaskEither } from 'fp-ts/TaskEither';

import type { ShardingStrategy, SuiteError, Test } from '../type';

export const shardTests = (p: {
  readonly shard: {
    readonly index: Either<string, number>;
    readonly count: Either<string, number>;
  };
  readonly strategy: ShardingStrategy;
}): ((res: TaskEither<SuiteError, readonly Test[]>) => TaskEither<SuiteError, readonly Test[]>) =>
  taskEither.chainEitherK((tests) =>
    pipe(
      p.shard,
      apply.sequenceS(either.Apply),
      either.bimap(
        (message): SuiteError => ({ type: 'ShardingError', message }),
        (shard) =>
          pipe(
            p.strategy({ shardCount: shard.count, tests }),
            readonlyArray.lookup(shard.index - 1),
            option.getOrElse<readonly Test[]>(() => [])
          )
      )
    )
  );
