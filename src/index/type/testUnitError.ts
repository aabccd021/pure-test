import type { AssertionResult } from '@src';

import type { AssertionError } from '.';

export type Type =
  | AssertionError.Type
  | { readonly code: 'GroupError'; readonly results: readonly AssertionResult[] };
