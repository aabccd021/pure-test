import type { Named, TestSuccess } from '@src';
import type { Either } from 'fp-ts/Either';

import type { TestError } from '.';

export type GroupError = {
  readonly code: 'GroupError';
  readonly results: readonly Either<Named<TestError.Union>, Named<TestSuccess>>[];
};

export const groupError = (
  results: readonly Either<Named<TestError.Union>, Named<TestSuccess>>[]
): GroupError => ({ code: 'GroupError', results });

export type TestError = { readonly code: 'TestError'; readonly value: TestError.Union };

export const testError = (value: TestError.Union): TestError => ({ code: 'TestError', value });

export type Union = GroupError | TestError;
