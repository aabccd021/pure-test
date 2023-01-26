import type { Named, TestSuccess } from '@src';
import type { Either } from 'fp-ts/Either';

import type { TestError as _TestError } from '.';

export type GroupError = {
  readonly code: 'GroupError';
  readonly results: readonly Either<Named<_TestError['Union']>, Named<TestSuccess>>[];
};

export const groupError = (
  results: readonly Either<Named<_TestError['Union']>, Named<TestSuccess>>[]
): GroupError => ({ code: 'GroupError', results });

export type TestError = { readonly code: 'TestError'; readonly value: _TestError['Union'] };

export const testError = (value: _TestError['Union']): TestError => ({ code: 'TestError', value });

export type Union = GroupError | TestError;
