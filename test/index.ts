import { pipe } from 'fp-ts/function';

import * as src from '../src';
import * as logErrors from './logErrors';
import * as setExitCode from './setExitCode';
import * as shouldTimeout from './shouldTimeout';
import * as _undefined from './undefined';

const tests = [
  ...logErrors.tests,
  ...setExitCode.tests,
  ...shouldTimeout.tests,
  ..._undefined.tests,
];

export const main = pipe(tests, src.runTests({}), src.logErrors, src.setExitCode);
