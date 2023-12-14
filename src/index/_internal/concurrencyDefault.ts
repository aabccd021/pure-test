import { pipe } from 'fp-ts/function';

import type { ConcurrencyConfig } from '../type';

export const concurrencyDefault = (
  config:
    | { readonly type: 'parallel' }
    | { readonly type: 'sequential'; readonly failFast?: false }
    | undefined
): ConcurrencyConfig =>
  pipe(config ?? { type: 'parallel' as const }, (c) =>
    c.type === 'sequential'
      ? { type: 'Sequential' as const, failFast: c.failFast ?? true }
      : { type: 'Parallel' }
  );
