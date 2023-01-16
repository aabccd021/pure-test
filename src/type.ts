import type { Task } from 'fp-ts/Task';
import type * as retry from 'retry-ts';

export type Assertion<A = unknown, B = unknown> = {
  readonly task: Task<A>;
  readonly toResult: B;
};

export type SingleAssertionTest = {
  readonly assertion: 'single';
  readonly name: string;
  readonly assert: Assertion;
  readonly shouldTimeout?: true;
  readonly timeout?: number;
  readonly retry?: retry.RetryPolicy;
};

export type MultipleAssertionTest = {
  readonly assertion: 'multiple';
  readonly name: string;
  readonly assert: Assertion;
  readonly shouldTimeout?: true;
  readonly timeout?: number;
  readonly retry?: retry.RetryPolicy;
};

export type Test = SingleAssertionTest;

export type TestConfig = {
  readonly concurrency?: { readonly type: 'parallel' } | { readonly type: 'sequential' };
};

export type Change = {
  readonly type: '-' | '+' | '0';
  readonly value: string;
};

export type TestFailedError =
  | {
      readonly code: 'assertion failed';
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
  readonly error: TestFailedError;
};
