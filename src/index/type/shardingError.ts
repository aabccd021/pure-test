export type ShardIndexOutOfBound = {
  readonly code: 'ShardIndexOutOfBound';
  readonly index: number;
  readonly shardCount: number;
};

export const shardIndexOutOfBound = (
  p: Omit<ShardIndexOutOfBound, 'code'>
): ShardIndexOutOfBound => ({ ...p, code: 'ShardIndexOutOfBound' });

export type TestCountChangedAfterSharding = {
  readonly code: 'TestCountChangedAfterSharding';
  readonly testCount: { readonly beforeSharding: number; readonly afterSharding: number };
};

export const testCountChangedAfterSharding = (testCount: {
  readonly beforeSharding: number;
  readonly afterSharding: number;
}): TestCountChangedAfterSharding => ({ code: 'TestCountChangedAfterSharding', testCount });

export type ShardIndexIsUnspecified = { readonly code: 'ShardIndexIsUnspecified' };

export const shardIndexIsUnspecified: ShardIndexIsUnspecified = { code: 'ShardIndexIsUnspecified' };

export type ShardIndexIsNotANumber = {
  readonly code: 'ShardIndexIsNotANumber';
  readonly value: string;
};

export const ShardIndexIsNotANumber = (value: string): ShardIndexIsNotANumber => ({
  code: 'ShardIndexIsNotANumber',
  value,
});

export type GetShardIndexError = ShardIndexIsNotANumber | ShardIndexIsUnspecified;

export type ShardCountIsUnspecified = { readonly code: 'ShardCountIsUnspecified' };

export const shardCountIsUnspecified: ShardCountIsUnspecified = { code: 'ShardCountIsUnspecified' };

export type ShardCountIsNotANumber = {
  readonly code: 'ShardCountIsNotANumber';
  readonly value: string;
};

export const shardCountIsNotANumber = (value: string): ShardCountIsNotANumber => ({
  code: 'ShardCountIsNotANumber',
  value,
});

export type GetShardCountError = ShardCountIsNotANumber | ShardCountIsUnspecified;

export type ShardingStrategyError = { readonly code: 'ShardingStrategyError' };

export const shardingStrategyError: ShardingStrategyError = { code: 'ShardingStrategyError' };

export type Union =
  | GetShardCountError
  | GetShardIndexError
  | ShardIndexOutOfBound
  | ShardingStrategyError
  | TestCountChangedAfterSharding;
