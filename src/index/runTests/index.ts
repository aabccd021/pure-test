import { either, readonlyArray, task, taskEither } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { flow, identity, pipe } from 'fp-ts/function';
import type { Task } from 'fp-ts/Task';
import type { TaskEither } from 'fp-ts/TaskEither';
import { retrying } from 'retry-ts/lib/Task';
import { match } from 'ts-pattern';

import { concurrencyDefault } from '../_internal/concurrencyDefault';
import { serializeError } from '../_internal/libs/serializeError';
import type {
  AssertEqual,
  Group,
  Named,
  SuiteResult,
  Test,
  TestConfig,
  TestResult,
  TestUnit,
  TestUnitResult,
} from '../type';
import { SuiteError, TestError, TestUnitError, TestUnitSuccess } from '../type';
import { assertEqual } from './assertEqual';
import { runWithConcurrency } from './runWithConcurrency';
import * as timeElapsed from './timeElapsed';

export const taskEitherBimapNamed =
  <T, L, R>(run: (t: T) => TaskEither<L, R>) =>
  (namedT: Named<T>) =>
    pipe(
      namedT.value,
      run,
      taskEither.bimap(
        (value) => ({ name: namedT.name, value }),
        (value) => ({ name: namedT.name, value })
      )
    );

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
  <L, T>(timeout: Test['timeout']) =>
  (te: TaskEither<L, T>) =>
    task
      .getRaceMonoid<Either<L | TestError['TimedOut'], T>>()
      .concat(te, task.delay(timeout)(taskEither.left(TestError.Union.as.TimedOut({}))));

const runWithRetry =
  (retryConfig: Test['retry']) =>
  <L, R>(te: TaskEither<L, R>) =>
    retrying(retryConfig, () => te, either.isLeft);

const runAct = (act: Task<AssertEqual>): TaskEither<TestError['UnhandledException'], AssertEqual> =>
  pipe(
    taskEither.tryCatch(act, identity),
    taskEither.orElse((exception) =>
      pipe(
        exception,
        serializeError,
        task.map((serialized) =>
          either.left(
            TestError.Union.as.UnhandledException({ exception: { value: exception, serialized } })
          )
        )
      )
    )
  );

const runTest = (test: Test): Task<TestResult> =>
  pipe(
    timeElapsed.ofTaskEither(runAct(test.act)),
    timeElapsed.chainEitherKW(assertEqual),
    runWithTimeout(test.timeout),
    runWithRetry(test.retry),
    taskEither.map(({ timeElapsedMs }) => ({ timeElapsedMs }))
  );

const runGroup = (group: Group) =>
  pipe(
    group.tests,
    runWithConcurrency({
      concurrency: group.concurrency,
      run: taskEitherBimapNamed(runTest),
    }),
    task.map(eitherArrayIsAllRight)
  );

const runTestUnit = (
  testUnit: TestUnit
): TaskEither<TestUnitError['Union'], TestUnitSuccess['Union']> =>
  match(testUnit)
    .with(
      { unit: 'Test' },
      flow(
        runTest,
        taskEither.bimap(
          (value) => TestUnitError.Union.as.TestError({ value }),
          (value) => TestUnitSuccess.Union.as.Test({ value })
        )
      )
    )
    .with(
      { unit: 'Group' },
      flow(
        runGroup,
        taskEither.bimap(
          (results) => TestUnitError.Union.as.GroupError({ results }),
          (results) => TestUnitSuccess.Union.as.Group({ results })
        )
      )
    )
    .exhaustive();

const testUnitResultsToSuiteResult = (testUnitResults: readonly TestUnitResult[]): SuiteResult =>
  pipe(
    testUnitResults,
    eitherArrayIsAllRight,
    either.mapLeft((results) => SuiteError.Union.as.TestRunError({ results }))
  );

export const runTestsWithFilledDefaultConfig = (
  config: TestConfig
): ((testsTE: TaskEither<SuiteError['Union'], readonly Named<TestUnit>[]>) => Task<SuiteResult>) =>
  taskEither.chain(
    flow(
      runWithConcurrency({
        concurrency: config.concurrency,
        run: taskEitherBimapNamed(runTestUnit),
      }),
      task.map(testUnitResultsToSuiteResult)
    )
  );

export const runTests = (config: {
  readonly concurrency?:
    | { readonly type: 'parallel' }
    | { readonly type: 'sequential'; readonly failFast?: false };
}) => runTestsWithFilledDefaultConfig({ concurrency: concurrencyDefault(config.concurrency) });
