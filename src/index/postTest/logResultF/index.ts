import { either, ioOption, readonlyArray, string, task } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import type { IO } from 'fp-ts/IO';
import type { Task } from 'fp-ts/Task';
import c from 'picocolors';

import type { Named, SuiteResult, TestUnitSuccess } from '../../type';
import { ShardingError, SuiteError } from '../../type';
import { testRunErrorToLines } from './testErrorToLines';

const shardingErrorToLines = ShardingError.matchStrict({
  ShardCountIsUnspecified: () => [`shard count is unspecified`],
  ShardCountIsNotANumber: ({ value }) => [`shard count is not a number : ${value}`],
  ShardIndexIsUnspecified: () => [`shard index is unspecified`],
  ShardIndexIsNotANumber: ({ value }) => [`shard index is not a number : ${value}`],
  ShardIndexOutOfBound: ({ index, shardCount }) => [
    `Shard index is out of bound:`,
    `       index: ${index}`,
    ` shard count: ${shardCount}`,
  ],
  TestCountChangedAfterSharding: ({ testCount }) => [
    `Test count changed after sharding:`,
    ` before: ${testCount.beforeSharding}`,
    `  after: ${testCount.afterSharding}`,
  ],
  ShardingStrategyError: () => [`ShardingStrategyError`],
});

const suiteErrorToLines = SuiteError.matchStrict({
  TestRunError: ({ results }) => testRunErrorToLines(results),
  DuplicateTestName: ({ name }) => [`Found duplicate test name: ${name}`],
  ShardingError: ({ value }) => shardingErrorToLines(value),
  WriteResultError: () => [],
});

const suiteSuccessToLines = (suiteSuccess: readonly Named<TestUnitSuccess>[]): readonly string[] =>
  pipe(
    suiteSuccess,
    readonlyArray.map(({ name }) => ` ${c.green('✓')} ${name}`),
    readonlyArray.concat(['', `All ${readonlyArray.size(suiteSuccess)} tests passed`])
  );

export const logResultF = (env: {
  readonly console: { readonly log: (str: string) => IO<void> };
}): ((res: Task<SuiteResult>) => Task<SuiteResult>) =>
  task.chainFirstIOK(
    flow(
      either.match(suiteErrorToLines, suiteSuccessToLines),
      ioOption.fromPredicate(readonlyArray.isNonEmpty),
      ioOption.map(readonlyArray.intercalate(string.Monoid)('\n')),
      ioOption.chainIOK(env.console.log)
    )
  );
