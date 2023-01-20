import { taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import { scopeTests } from '../src';
import * as src from '../src';
import * as srcNode from '../src/node';
import { throwOnDuplicateTestName } from '../src/throwOnDuplicateTestName';
import * as concurrency from './concurrency';
import * as exit from './exitF';
import * as logErrorDetails from './logErrorDetailsF';
import * as primitive from './primitive';
import * as runTests from './runTests';
import * as timeout from './timeout';

const tests = scopeTests({ logErrorDetails, exit, timeout, primitive, concurrency, runTests });

export const main = pipe(
  tests,
  taskEither.right,
  throwOnDuplicateTestName,
  src.runTests({}),
  src.logErrorDetails,
  src.logTestsNameAndResults,
  srcNode.exit
);
