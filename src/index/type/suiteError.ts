import type { ShardingError as _ShardingError, TestUnitResult } from '.';

export type DuplicateTestName = { readonly code: 'DuplicateTestName'; readonly name: string };

export const duplicateTestName = (name: string): DuplicateTestName => ({
  code: 'DuplicateTestName',
  name,
});

export type ShardingError = {
  readonly code: 'ShardingError';
  readonly value: _ShardingError.Union;
};

export const shardingError = (value: _ShardingError.Union): ShardingError => ({
  code: 'ShardingError',
  value,
});

export type TestRunError = {
  readonly code: 'TestRunError';
  readonly results: readonly TestUnitResult[];
};

export const testRunError = (results: readonly TestUnitResult[]): TestRunError => ({
  code: 'TestRunError',
  results,
});

export type Union = DuplicateTestName | ShardingError | TestRunError;
