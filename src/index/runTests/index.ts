import { either, readonlyArray, task, taskEither } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { flow, pipe } from 'fp-ts/function';
import type { Task } from 'fp-ts/Task';
import type { TaskEither } from 'fp-ts/TaskEither';
import { retrying } from 'retry-ts/lib/Task';
import { match } from 'ts-pattern';

import { concurrencyDefault } from '../_internal/concurrencyDefault';
import type {
  Named,
  SuiteError,
  SuiteResult,
  TestConfig,
  TestConfigRequired,
  TestError,
  TestResult,
  TestUnit,
  TestUnitError,
  TestUnitResult,
} from '../type';
import { named, suiteError, testError, testUnitError, testUnitSuccess } from '../type';
import { runAssert } from './assert';
import { runWithConcurrency } from './runWithConcurrency';
import * as timeElapsed from './timeElapsed';

const eitherArrayIsAllRight = <L, R>(
  arr: readonly Either<L, R>[]
): Either<readonly Either<L, R>[], readonly R[]> =>
  pipe(
    readonlyArray.rights(arr),
    either.fromPredicate(
      (rights) => readonlyArray.size(rights) === readonlyArray.size(arr),
      () => arr
    )
  );

const runWithTimeout =
  <L, T>(timeout: TestUnit.Test['timeout']) =>
  (te: TaskEither<L, T>) =>
    task
      .getRaceMonoid<Either<L | TestError.TimedOut, T>>()
      .concat(te, task.delay(timeout)(taskEither.left(testError.timedOut)));

const runWithRetry =
  (retryConfig: TestUnit.Test['retry']) =>
  <L, R>(te: TaskEither<L, R>) =>
    retrying(retryConfig, () => te, either.isLeft);

const runTest = (test: TestUnit.Test): Task<TestResult> =>
  pipe(
    timeElapsed.ofTaskEither(taskEither.tryCatch(test.act, testError.unhandledException)),
    timeElapsed.chainEitherKW(runAssert),
    runWithTimeout(test.timeout),
    runWithRetry(test.retry)
  );

const runGroup = (group: TestUnit.Group) =>
  pipe(
    group.tests,
    runWithConcurrency({ concurrency: group.concurrency, run: named.mapTaskEither(runTest) }),
    task.map(eitherArrayIsAllRight)
  );

const runTestUnit = (
  testUnit: TestUnit.Union
): TaskEither<TestUnitError.Union, testUnitSuccess.Union> =>
  match(testUnit)
    .with(
      { unit: 'test' },
      flow(runTest, taskEither.bimap(testUnitError.testError, testUnitSuccess.test))
    )
    .with(
      { unit: 'group' },
      flow(runGroup, taskEither.bimap(testUnitError.groupError, testUnitSuccess.group))
    )
    .exhaustive();

const testUnitResultsToSuiteResult = (testUnitResults: readonly TestUnitResult[]): SuiteResult =>
  pipe(testUnitResults, eitherArrayIsAllRight, either.mapLeft(suiteError.testRunError));

export const runTestsWithFilledDefaultConfig = (
  config: TestConfigRequired
): ((
  testsTE: TaskEither<SuiteError.Union, readonly Named<TestUnit.Union>[]>
) => Task<SuiteResult>) =>
  taskEither.chain(
    flow(
      runWithConcurrency({
        concurrency: config.concurrency,
        run: named.mapTaskEither(runTestUnit),
      }),
      task.map(testUnitResultsToSuiteResult)
    )
  );

export const runTests = (config: TestConfig) =>
  runTestsWithFilledDefaultConfig({ concurrency: concurrencyDefault(config.concurrency) });
