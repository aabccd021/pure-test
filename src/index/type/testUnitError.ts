import type { TestResult } from '@src';

import type { TestError } from '.';

export type Union =
  | { readonly code: 'GroupError'; readonly name: string; readonly results: readonly TestResult[] }
  | { readonly code: 'TestError'; readonly name: string; readonly value: TestError.Union };
