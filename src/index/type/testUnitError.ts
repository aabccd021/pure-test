import type { TestResult } from '@src';

import type { TestError } from '.';

export type GroupError = {
  readonly code: 'GroupError';
  readonly name: string;
  readonly results: readonly TestResult[];
};

export type TestError = {
  readonly code: 'TestError';
  readonly name: string;
  readonly value: TestError.Union;
};

export type Union = GroupError | TestError;
