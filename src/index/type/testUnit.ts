import type { Assert, Concurrency } from '@src';
import type { Task } from 'fp-ts/Task';
import type * as retry from 'retry-ts';

export type SingleTest = {
  readonly type: 'single';
  readonly name: string;
  readonly act: Task<Assert.Type>;
  readonly timeout?: number;
  readonly retry?: retry.RetryPolicy;
};

export type Group = {
  readonly type: 'group';
  readonly name: string;
  readonly concurrency?: Concurrency;
  readonly asserts: readonly SingleTest[];
};

export type Type = Group | SingleTest;
