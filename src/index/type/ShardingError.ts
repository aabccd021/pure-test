export type ShardIndexOutOfBound = {
  readonly type: 'ShardIndexOutOfBound';
  readonly index: number;
  readonly shardCount: number;
};

export type TestCountChangedAfterSharding = {
  readonly type: 'TestCountChangedAfterSharding';
  readonly testCount: {
    readonly beforeSharding: number;
    readonly afterSharding: number;
  };
};

export type ShardIndexIsUnspecified = {
  readonly type: 'ShardIndexIsUnspecified';
};

export type ShardIndexIsNotANumber = {
  readonly type: 'ShardIndexIsNotANumber';
  readonly value: string;
};

export type GetShardIndexError = ShardIndexIsNotANumber | ShardIndexIsUnspecified;

export type ShardCountIsUnspecified = {
  readonly type: 'ShardCountIsUnspecified';
};

export type ShardCountIsNotANumber = {
  readonly type: 'ShardCountIsNotANumber';
  readonly value: string;
};

export type GetShardCountError = ShardCountIsNotANumber | ShardCountIsUnspecified;

export type ShardingStrategyError = {
  readonly type: 'ShardingStrategyError';
};

export type ShardingError = {
  readonly type: 'ShardingError';
  readonly value:
    | GetShardCountError
    | GetShardIndexError
    | ShardIndexOutOfBound
    | ShardingStrategyError
    | TestCountChangedAfterSharding;
};
