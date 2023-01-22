import * as src from '@src';
import * as srcNode from '@src/node';
import { taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import * as concurrency from './concurrency';
import * as exitF from './exitF';
import * as group from './group';
import * as logErrorDetailsF from './logErrorDetailsF';
import * as primitive from './primitive';
import * as runTests from './runTests';
import * as throwOnDuplicateTestName from './throwOnDuplicateTestName';
import * as timeout from './timeout';

const tests = src.scopeTests({
  logErrorDetailsF,
  exitF,
  timeout,
  primitive,
  concurrency,
  runTests,
  group,
  throwOnDuplicateTestName,
});

export const main = pipe(
  tests,
  taskEither.right,
  src.throwOnDuplicateTestName,
  src.runTests({}),
  src.logTestsNameAndResults,
  src.logErrorDetails,
  src.logSummary,
  srcNode.exit
);
