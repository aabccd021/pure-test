import type { TestResult } from '@src';

import type { TestError } from '.';

export type Type =
  | { readonly code: 'GroupError'; readonly results: readonly TestResult[] }
  | { readonly code: 'Skipped' }
  | { readonly code: 'TestError'; readonly value: TestError.Type };
