import type { Assert, ConcurrencyConfig, Named } from '@src';
import type { Task } from 'fp-ts/Task';
import type * as retry from 'retry-ts';

export type Test = {
  readonly type: 'test';
  readonly act: Task<Assert.Union>;
  readonly timeout: number;
  readonly retry: retry.RetryPolicy;
};

export type Group = {
  readonly type: 'group';
  readonly concurrency: ConcurrencyConfig;
  readonly asserts: readonly Named<Test>[];
};

export type Union = Group | Test;
