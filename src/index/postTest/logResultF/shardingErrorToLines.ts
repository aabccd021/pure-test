import { match } from 'ts-pattern';

import type { SuiteError } from '../../type';

export const shardingErrorToLines = (error: SuiteError.ShardingError): readonly string[] =>
  match(error.value)
    .with({ code: 'ShardCountIsUnspecified' }, () => [`shard count is unspecified`])
    .with({ code: 'ShardCountIsNotANumber' }, ({ value }) => [
      `shard count is not a number : ${value}`,
    ])
    .with({ code: 'ShardIndexIsUnspecified' }, () => [`shard index is unspecified`])
    .with({ code: 'ShardIndexIsNotANumber' }, ({ value }) => [
      `shard index is not a number : ${value}`,
    ])
    .with({ code: 'ShardIndexOutOfBound' }, ({ index, shardCount }) => [
      `Shard index is out of bound:`,
      `       index: ${index}`,
      ` shard count: ${shardCount}`,
    ])
    .with({ code: 'TestCountChangedAfterSharding' }, ({ testCount }) => [
      `Test count changed after sharding:`,
      ` before: ${testCount.beforeSharding}`,
      `  after: ${testCount.afterSharding}`,
    ])
    .with({ code: 'ShardingStrategyError' }, () => [`ShardingStrategyError`])
    .exhaustive();
