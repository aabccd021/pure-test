import { readonlyArray } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import type { TestOrGroup } from '../src';
import * as src from '../src';
import * as srcNode from '../src/node';
import * as exit from './exitF';
import * as logErrorDetails from './logErrorDetailsF';
import * as primitive from './primitive';
import * as primitive2 from './primitive2';
import * as runTests from './runTests';
import * as timeout from './timeout';

const tests: readonly (readonly TestOrGroup[])[] = [
  logErrorDetails.tests,
  exit.tests,
  timeout.tests,
  primitive.tests,
  primitive2.tests,
  runTests.tests,
];

export const main = pipe(
  tests,
  readonlyArray.flatten,
  src.runTests({ concurrency: { type: 'sequential' } }),
  src.logErrorDetails,
  src.logTestsNameAndResults,
  srcNode.exit
);
