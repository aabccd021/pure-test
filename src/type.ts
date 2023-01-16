import type { Task } from 'fp-ts/Task';
import type * as retry from 'retry-ts';

export type Concurrency = { readonly type: 'parallel' } | { readonly type: 'sequential' };

export type Assertion<A = unknown, B = unknown> = {
  readonly name: string;
  readonly act: Task<A>;
  readonly assert: B;
  readonly timeout?: number;
  readonly retry?: retry.RetryPolicy;
};

export type SingleAssertionTest = {
  readonly assertion: 'single';
  readonly todo?: true;
  readonly assert: Assertion;
};

export type MultipleAssertionTest = {
  readonly assertion: 'multiple';
  readonly name: string;
  readonly todo?: true;
  readonly concurrency?: Concurrency;
  readonly asserts: readonly Assertion[];
};

export type Test = MultipleAssertionTest | SingleAssertionTest;

export type TestConfig = {
  readonly concurrency?: Concurrency;
};

export type Change = {
  readonly type: '-' | '+' | '0';
  readonly value: string;
};

export type AssertionError =
  | {
      readonly code: 'not equal';
      readonly diff: readonly Change[];
      readonly actual: unknown;
      readonly expected: unknown;
    }
  | {
      readonly code: 'serialization failed';
      readonly details: unknown;
    }
  | {
      readonly code: 'timed out';
    }
  | {
      readonly code: 'unhandled exception';
      readonly exception: unknown;
    };

export type TestFailedResult = {
  readonly name: string;
  readonly error: AssertionError;
};
