import * as src from '@src';
import { env } from '@src/node18';
import { taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import * as assert from './assert';
import * as postTest from './postTest';
import * as preTest from './preTest';
import * as runTests from './runTests';
import * as sharding from './sharding';
import * as test from './test';

const tests = src.scope({ assert, postTest, preTest, runTests, test, sharding });

export const main = pipe(
  tests,
  taskEither.right,
  src.preTest.throwOnDuplicateTestName,
  src.runTests({}),
  src.postTest.logResult,
  src.postTest.exit(env)
);
