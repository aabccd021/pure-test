import { pipe } from 'fp-ts/function';

import { test as rawTest } from './core';
import { withRetry } from './retry';
import { withTimeout } from './timeout';

export const test = pipe(rawTest, withRetry, withTimeout);
