import * as src from '@src/index';
import * as srcNode from '@src/node';
import { taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import * as concurrency from './concurrency';
import * as exit from './exitF';
import * as logErrorDetails from './logErrorDetailsF';
import * as primitive from './primitive';
import * as runTests from './runTests';
import * as timeout from './timeout';

const tests = src.scopeTests({ logErrorDetails, exit, timeout, primitive, concurrency, runTests });

export const main = pipe(
  tests,
  taskEither.right,
  src.throwOnDuplicateTestName,
  src.runTests({}),
  src.logErrorDetails,
  src.logTestsNameAndResults,
  srcNode.exit
);
