import type { Either } from 'fp-ts/Either';
import type { Task } from 'fp-ts/Task';
import type { TaskEither } from 'fp-ts/TaskEither';
import type * as retry from 'retry-ts';

import type * as Assert from './assert';

export type { Assert };

export type Concurrency =
  | { readonly type: 'parallel' }
  | { readonly type: 'sequential'; readonly failFast?: false };

export type Assertion = {
  readonly name: string;
  readonly act: Task<Assert.Type>;
  readonly timeout?: number;
  readonly retry?: retry.RetryPolicy;
};

export type SingleTest = {
  readonly type: 'single';
  readonly todo?: true;
  readonly assert: Assertion;
};

export type GroupTest = {
  readonly type: 'group';
  readonly name: string;
  readonly todo?: true;
  readonly concurrency?: Concurrency;
  readonly asserts: readonly Assertion[];
};

export type Test = GroupTest | SingleTest;

export type TestConfig = { readonly concurrency?: Concurrency };

export type Change = { readonly type: '-' | '+' | '0'; readonly value: string };

export type DiffLines = (p: {
  readonly expected: string;
  readonly received: string;
}) => readonly Change[];

export type SerializationError = {
  readonly code: 'SerializationError';
  readonly path: readonly (number | string)[];
};

export type AssertionError =
  | SerializationError
  | {
      readonly code: 'AssertionError';
      readonly changes: readonly Change[];
      readonly received: unknown;
      readonly expected: unknown;
    }
  | { readonly code: 'Skipped' }
  | { readonly code: 'timed out' }
  | { readonly code: 'UnexpectedLeft'; readonly value: unknown }
  | { readonly code: 'UnexpectedNone' }
  | { readonly code: 'UnexpectedRight'; readonly value: unknown }
  | { readonly code: 'unhandled exception'; readonly exception: unknown };

export type AssertionFailResult = { readonly name: string; readonly error: AssertionError };

export type AssertionPassResult = { readonly name: string; readonly timeElapsedMs: number };

export type AssertionResult = Either<AssertionFailResult, AssertionPassResult>;

export type TestError =
  | AssertionError
  | { readonly code: 'MultipleAssertionError'; readonly results: readonly AssertionResult[] };

export type TestFailResult = { readonly name: string; readonly error: TestError };

export type TestPassResult = { readonly name: string; readonly timeElapsedMs: number };

export type TestResult = Either<TestFailResult, TestPassResult>;

export type SuiteError =
  | { readonly type: 'DuplicateTestName'; readonly name: string }
  | { readonly type: 'ShardingError'; readonly message: string }
  | { readonly type: 'TestError'; readonly results: readonly TestResult[] };

export type SuiteResult = Either<SuiteError, readonly TestPassResult[]>;

export type ShardingStrategy = (p: {
  readonly shardCount: number;
  readonly tests: readonly Test[];
}) => TaskEither<string, readonly (readonly Test[])[]>;

export type GetShardIndex = TaskEither<string, number>;
export type GetShardCount = TaskEither<string, number>;
