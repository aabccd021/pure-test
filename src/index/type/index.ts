import type { Either } from 'fp-ts/Either';
import type { TaskEither } from 'fp-ts/TaskEither';

import type * as Assert from './assert';
import type * as AssertionError from './assertionError';
import type * as ShardingError from './shardingError';
import type * as SuiteResult from './suiteResult';
import type * as TestResult from './testResult';
import type * as TestUnit from './testUnit';

export type { Assert, AssertionError, ShardingError, SuiteResult, TestResult, TestUnit };

export type Concurrency =
  | { readonly type: 'parallel' }
  | { readonly type: 'sequential'; readonly failFast?: false };

export type TestConfig = { readonly concurrency?: Concurrency };

export type Change = { readonly type: '-' | '+' | '0'; readonly value: string };

export type DiffLines = (p: {
  readonly expected: string;
  readonly received: string;
}) => readonly Change[];

export type AssertionFailResult = { readonly name: string; readonly error: AssertionError.Type };

export type AssertionPassResult = { readonly name: string; readonly timeElapsedMs: number };

export type AssertionResult = Either<AssertionFailResult, AssertionPassResult>;

export type TestError =
  | AssertionError.Type
  | { readonly code: 'MultipleAssertionError'; readonly results: readonly AssertionResult[] };

export type ShardingStrategy = (p: {
  readonly shardCount: number;
  readonly tests: readonly TestUnit.Type[];
}) => TaskEither<ShardingError.ShardingStrategyError, readonly (readonly TestUnit.Type[])[]>;

export type GetShardIndex = TaskEither<ShardingError.GetShardIndexError, number>;

export type GetShardCount = TaskEither<ShardingError.GetShardCountError, number>;
