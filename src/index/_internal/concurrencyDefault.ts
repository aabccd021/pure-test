import type { ConcurrencyConfigRequired } from '@src';
import { pipe } from 'fp-ts/function';

import type { ConcurrencyConfig } from '../type';

export const concurrencyDefault = (
  config: ConcurrencyConfig | undefined
): ConcurrencyConfigRequired =>
  pipe(config ?? { type: 'parallel' as const }, (c) =>
    c.type === 'sequential' ? { type: 'sequential' as const, failFast: c.failFast ?? true } : c
  );
