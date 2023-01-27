import type { AssertEqual, ConcurrencyConfig, Named } from '@src';
import type { Task } from 'fp-ts/Task';
import type * as retry from 'retry-ts';

export type Test = {
  readonly unit: 'Test';
  readonly act: Task<AssertEqual>;
  readonly timeout: number;
  readonly retry: retry.RetryPolicy;
};

export type Group = {
  readonly unit: 'Group';
  readonly concurrency: ConcurrencyConfig;
  readonly tests: readonly Named<Test>[];
};

export type Union = Group | Test;
