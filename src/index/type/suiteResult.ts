import type { ShardingError, TestPassResult } from '@src';
import type { Either } from 'fp-ts/Either';

import type { TestResult } from '.';

export type Left =
  | { readonly type: 'DuplicateTestName'; readonly name: string }
  | { readonly type: 'ShardingError'; readonly value: ShardingError.Type }
  | { readonly type: 'TestError'; readonly results: readonly TestResult[] };

export type Right = readonly TestPassResult[];

export type Type = Either<Left, Right>;
