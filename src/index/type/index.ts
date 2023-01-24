import type { Either, Left, Right } from 'fp-ts/Either';
import type { TaskEither } from 'fp-ts/TaskEither';

import type * as Assert from './assert';
import type * as ShardingError from './shardingError';
import type * as TestError from './testError';
import type * as TestUnit from './testUnit';
import type * as TestUnitError from './testUnitError';

export type { Assert, ShardingError, TestError, TestUnit, TestUnitError };

export type RightOf<E> = E extends Right<infer R> ? R : never;
export type LeftOf<E> = E extends Left<infer L> ? L : never;

export type TestResult = Either<
  { readonly name: string; readonly error: TestError.Union },
  { readonly name: string; readonly timeElapsedMs: number }
>;

export type TestUnitSuccessResult =
  | {
      readonly unit: 'group';
      readonly name: string;
      readonly results: readonly RightOf<TestResult>[];
    }
  | { readonly unit: 'test'; readonly name: string; readonly timeElapsedMs: number };

export type TestUnitResult = Either<TestUnitError.Union, TestUnitSuccessResult>;

export type SuiteResult = Either<
  | { readonly type: 'DuplicateTestName'; readonly name: string }
  | { readonly type: 'ShardingError'; readonly value: ShardingError.Union }
  | { readonly type: 'TestRunError'; readonly results: readonly TestUnitResult[] },
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
  readonly tests: readonly TestUnit.Union[];
}) => TaskEither<ShardingError.ShardingStrategyError, readonly (readonly TestUnit.Union[])[]>;

export type GetShardIndex = TaskEither<ShardingError.GetShardIndexError, number>;

export type GetShardCount = TaskEither<ShardingError.GetShardCountError, number>;
