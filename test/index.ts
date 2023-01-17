import { readonlyArray } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import * as src from '../src';
import * as srcNode from '../src/node';
import * as logErrors from './logErrors';
import * as primitive from './primitive';
import * as setExitCode from './setExitCode';
import * as timeout from './timeout';

const tests = [logErrors.tests, setExitCode.tests, timeout.tests, primitive.tests];

export const main = pipe(
  tests,
  readonlyArray.flatten,
  src.runTests({}),
  src.logErrors,
  srcNode.setExitCode
);
