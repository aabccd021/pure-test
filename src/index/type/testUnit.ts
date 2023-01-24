import type { Assert, Concurrency } from '@src';
import type { Task } from 'fp-ts/Task';
import type * as retry from 'retry-ts';

export type Test = {
  readonly type: 'test';
  readonly name: string;
  readonly act: Task<Assert.Union>;
  readonly timeout?: number;
  readonly retry?: retry.RetryPolicy;
};

export type Group = {
  readonly type: 'group';
  readonly name: string;
  readonly concurrency?: Concurrency;
  readonly asserts: readonly Test[];
};

export type Union = Group | Test;
