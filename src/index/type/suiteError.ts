import type { ShardingError as _ShardingError, TestUnitResult } from '.';

export type DuplicateTestName = { readonly type: 'DuplicateTestName'; readonly name: string };

export type ShardingError = {
  readonly type: 'ShardingError';
  readonly value: _ShardingError.Union;
};

export type TestRunError = {
  readonly type: 'TestRunError';
  readonly results: readonly TestUnitResult[];
};

export type Union = DuplicateTestName | ShardingError | TestRunError;
