import type { TestResult } from '@src';

import type { TestError } from '.';

export type Type =
  | { readonly code: 'Group'; readonly results: readonly TestResult[] }
  | { readonly code: 'Skipped' }
  | { readonly code: 'Test'; readonly value: TestError.Type };
