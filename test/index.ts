import * as src from '@src';
import * as srcNode from '@src/node';
import { taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import * as assert from './assert';
import * as postTest from './postTest';
import * as preTest from './preTest';
import * as runTests from './runTests';
import * as test from './test';

const tests = src.test.scope({
  assert,
  postTest,
  preTest,
  runTests,
  test,
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
