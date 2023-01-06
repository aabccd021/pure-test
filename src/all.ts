import { pipe } from 'fp-ts/function';

import { runWithAggregatedErrors, withAggregatedErrors } from './aggregate';
import { runWithColoredDiff } from './color';
import { test as rawTest } from './core';
import { withName, withNamedErrors } from './name';
import { withRetry } from './retry';
import { withSkipNames } from './skipName';
import { withPrintTime } from './time';
import { withTimeout } from './timeout';

export const test = pipe(
  rawTest,
  withTimeout,
  withName,
  withSkipNames(['aab']),
  withNamedErrors,
  withPrintTime,
  withRetry,
  withAggregatedErrors
);

const tests = [
  test({ name: 'aab', expect: async () => '', toResult: '' }),
  test({ name: 'ccd', expect: async () => '', toResult: '' }),
];

export const res = pipe(
  tests,
  runWithAggregatedErrors,
  (x) => x,
  runWithColoredDiff,
  (x) => x
  // runWithSkipName
);
