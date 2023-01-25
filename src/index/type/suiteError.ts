import type { ShardingError as _ShardingError, TestUnitResult } from '.';

export type DuplicateTestName = { readonly type: 'DuplicateTestName'; readonly name: string };

export const duplicateTestName = (name: string): DuplicateTestName => ({
  type: 'DuplicateTestName',
  name,
});

export type ShardingError = {
  readonly type: 'ShardingError';
  readonly value: _ShardingError.Union;
};

export const shardingError = (value: _ShardingError.Union): ShardingError => ({
  type: 'ShardingError',
  value,
});

export type TestRunError = {
  readonly type: 'TestRunError';
  readonly results: readonly TestUnitResult[];
};

export const testRunError = (results: readonly TestUnitResult[]): TestRunError => ({
  type: 'TestRunError',
  results,
});

export type Union = DuplicateTestName | ShardingError | TestRunError;
