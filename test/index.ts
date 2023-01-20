import { readonlyArray, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import type { TestOrGroup } from '../src';
import * as src from '../src';
import * as srcNode from '../src/node';
import { throwOnDuplicateTestName } from '../src/throwOnDuplicateTestName';
import * as concurrency from './concurrency';
import * as exit from './exitF';
import * as logErrorDetails from './logErrorDetailsF';
import * as primitive from './primitive';
import * as runTests from './runTests';
import * as timeout from './timeout';

const tests: readonly (readonly TestOrGroup[])[] = [
  logErrorDetails.tests,
  exit.tests,
  timeout.tests,
  primitive.tests,
  concurrency.tests,
  runTests.tests,
];

export const main = pipe(
  tests,
  readonlyArray.flatten,
  taskEither.right,
  throwOnDuplicateTestName,
  src.runTests({}),
  src.logErrorDetails,
  src.logTestsNameAndResults,
  srcNode.exit
);
