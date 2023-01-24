import type { Either, Left, Right } from 'fp-ts/Either';
import type { TaskEither } from 'fp-ts/TaskEither';

import type * as Assert from './assert';
import type * as AssertionError from './assertionError';
import type * as ShardingError from './shardingError';
import type * as TestUnit from './testUnit';
import type * as TestUnitError from './testUnitError';

export type { Assert, AssertionError, ShardingError, TestUnit, TestUnitError };

export type RightOf<E> = E extends Right<infer R> ? R : never;
export type LeftOf<E> = E extends Left<infer L> ? L : never;

export type AssertionResult = Either<
  { readonly name: string; readonly error: AssertionError.Type },
  { readonly name: string; readonly timeElapsedMs: number }
>;

export type TestUnitResult = Either<
  { readonly name: string; readonly error: TestUnitError.Type },
  { readonly name: string; readonly timeElapsedMs: number }
>;

export type SuiteResult = Either<
  | { readonly type: 'DuplicateTestName'; readonly name: string }
  | { readonly type: 'ShardingError'; readonly value: ShardingError.Type }
  | { readonly type: 'TestError'; readonly results: readonly TestUnitResult[] },
  readonly RightOf<TestUnitResult>[]
>;

export type Concurrency =
  | { readonly type: 'parallel' }
  | { readonly type: 'sequential'; readonly failFast?: false };

export type TestConfig = { readonly concurrency?: Concurrency };

export type Change = { readonly type: '-' | '+' | '0'; readonly value: string };

export type DiffLines = (p: {
  readonly expected: string;
  readonly received: string;
}) => readonly Change[];

export type ShardingStrategy = (p: {
  readonly shardCount: number;
  readonly tests: readonly TestUnit.Type[];
}) => TaskEither<ShardingError.ShardingStrategyError, readonly (readonly TestUnit.Type[])[]>;

export type GetShardIndex = TaskEither<ShardingError.GetShardIndexError, number>;

export type GetShardCount = TaskEither<ShardingError.GetShardCountError, number>;
