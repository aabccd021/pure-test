import { pipe } from 'fp-ts/function';

import * as src from '../src';
import * as logErrors from './logErrors';
import * as primitive from './primitive';
import * as setExitCode from './setExitCode';
import * as shouldTimeout from './shouldTimeout';

const tests = [
  ...logErrors.tests,
  ...setExitCode.tests,
  ...shouldTimeout.tests,
  ...primitive.tests,
];

export const main = pipe(tests, src.runTests({}), src.logErrors, src.setExitCode);
