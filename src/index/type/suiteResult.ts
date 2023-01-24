import type { ShardingError } from '@src';
import type { Either } from 'fp-ts/Either';

import type { TestResult } from '.';

export type Left =
  | { readonly type: 'DuplicateTestName'; readonly name: string }
  | { readonly type: 'ShardingError'; readonly value: ShardingError.Type }
  | { readonly type: 'TestError'; readonly results: readonly TestResult.Type[] };

export type Right = readonly TestResult.Right[];

export type Type = Either<Left, Right>;
