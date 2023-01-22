import * as src from '@src';
import * as srcNode from '@src/node';
import { taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import * as concurrency from './concurrency';
import * as exitF from './exitF';
import * as group from './group';
import * as logErrorDetailsF from './logErrorDetailsF';
import * as primitive from './primitive';
import * as retry from './retry';
import * as runTests from './runTests';
import * as throwOnDuplicateTestName from './throwOnDuplicateTestName';
import * as timeout from './timeout';

const tests = src.test.scope({
  concurrency,
  exitF,
  group,
  logErrorDetailsF,
  primitive,
  retry,
  runTests,
  throwOnDuplicateTestName,
  timeout,
});

export const main = pipe(
  tests,
  taskEither.right,
  src.preTest.throwOnDuplicateTestName,
  src.runTests({}),
  src.postTest.logTestsNameAndResults,
  src.postTest.logErrorDetails,
  src.postTest.logSummary,
  srcNode.postTest.exit
);
