import type { Change } from 'diff';
import type { Task } from 'fp-ts/Task';
import type * as retry from 'retry-ts';

export type SingleAssertionTest<E = unknown, R = unknown> = {
  readonly type: 'single';
  readonly name: string;
  readonly expect: Task<E>;
  readonly shouldTimeout?: true;
  readonly toResult: R;
  readonly timeout?: number;
  readonly retry?:
    | {
        readonly type: 'policy';
        readonly policy: retry.RetryPolicy;
      }
    | { readonly type: 'count'; readonly count: number };
};

export type Test = SingleAssertionTest;

export type TestsWithConfig = {
  readonly tests: readonly Test[];
  readonly concurrency?: { readonly type: 'parallel' } | { readonly type: 'sequential' };
};

export type TestFailedError =
  | {
      readonly code: 'assertion failed';
      readonly diffs: readonly Change[];
      actual: unknown;
      expected: unknown
    }
  | {
      readonly code: 'stringify failed';
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
