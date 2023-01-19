import { readonlyArray } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import * as src from '../src';
import * as srcNode from '../src/node';
import * as exit from './exitF';
import * as logErrorDetails from './logErrorDetailsF';
import * as primitive from './primitive';
import * as timeout from './timeout';

const tests = [logErrorDetails.tests, exit.tests, timeout.tests, primitive.tests];

export const main = pipe(
  tests,
  readonlyArray.flatten,
  src.runTests({}),
  src.logErrorDetails,
  srcNode.exit
);
