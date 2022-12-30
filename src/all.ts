import { pipe } from 'fp-ts/function';

import { withAggregatedErrors } from './aggregate';
import { test as rawTest } from './core';
import { withName } from './name';
import { withRetry } from './retry';
import { withPrintTime } from './time';
import { withTimeout } from './timeout';

export const test = pipe(
  rawTest,
  withTimeout,
  withName,
  withPrintTime,
  withRetry,
  withAggregatedErrors
);
