import type { ShardingError } from '@src';
import { match } from 'ts-pattern';

export const shardingErrorToContentLines = (
  error: ShardingError.Type['value']
): readonly string[] =>
  match(error)
    .with({ type: 'ShardCountIsUnspecified' }, () => [`shard count is unspecified`])
    .with({ type: 'ShardCountIsNotANumber' }, ({ value }) => [
      `shard count is not a number : ${value}`,
    ])
    .with({ type: 'ShardIndexIsUnspecified' }, () => [`shard index is unspecified`])
    .with({ type: 'ShardIndexIsNotANumber' }, ({ value }) => [
      `shard index is not a number : ${value}`,
    ])
    .with({ type: 'ShardIndexOutOfBound' }, ({ index, shardCount }) => [
      `Shard index is out of bound:`,
      `       index: ${index}`,
      ` shard count: ${shardCount}`,
    ])
    .with({ type: 'TestCountChangedAfterSharding' }, ({ testCount }) => [
      `Test count changed after sharding:`,
      ` before: ${testCount.beforeSharding}`,
      `  after: ${testCount.afterSharding}`,
    ])
    .with({ type: 'ShardingStrategyError' }, () => [`ShardingStrategyError`])
    .exhaustive();
