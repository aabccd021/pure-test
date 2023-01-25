import type { Assert, ConcurrencyConfigRequired, Named } from '@src';
import type { Task } from 'fp-ts/Task';
import type * as retry from 'retry-ts';

export type Test = {
  readonly unit: 'test';
  readonly act: Task<Assert.Union>;
  readonly timeout: number;
  readonly retry: retry.RetryPolicy;
};

export type Group = {
  readonly unit: 'group';
  readonly concurrency: ConcurrencyConfigRequired;
  readonly tests: readonly Named<Test>[];
};

export type Union = Group | Test;
