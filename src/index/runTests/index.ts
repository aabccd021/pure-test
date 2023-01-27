import { either, readonlyArray, task, taskEither } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { flow, pipe } from 'fp-ts/function';
import type { Task } from 'fp-ts/Task';
import type { TaskEither } from 'fp-ts/TaskEither';
import { match } from 'ts-pattern';

import { concurrencyDefault } from '../_internal/concurrencyDefault';
import type { Group, Named, SuiteResult, TestConfig, TestUnit, TestUnitResult } from '../type';
import { SuiteError, TestUnitError, TestUnitSuccess } from '../type';
import { runTest } from './runTest';
import { runWithConcurrency } from './runWithConcurrency';

const taskEitherBimapNamed =
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

const runGroup = (group: Group) =>
  pipe(
    group.tests,
    runWithConcurrency({ concurrency: group.concurrency, run: taskEitherBimapNamed(runTest) }),
    task.map(eitherArrayIsAllRight)
  );

const runTestUnit = (testUnit: TestUnit): TaskEither<TestUnitError, TestUnitSuccess> =>
  match(testUnit)
    .with(
      { unit: 'Test' },
      flow(
        runTest,
        taskEither.bimap(
          (value) => TestUnitError.as.TestError({ value }),
          (value) => TestUnitSuccess.as.Test({ value })
        )
      )
    )
    .with(
      { unit: 'Group' },
      flow(
        runGroup,
        taskEither.bimap(
          (results) => TestUnitError.as.GroupError({ results }),
          (results) => TestUnitSuccess.as.Group({ results })
        )
      )
    )
    .exhaustive();

const testUnitResultsToSuiteResult = (testUnitResults: readonly TestUnitResult[]): SuiteResult =>
  pipe(
    testUnitResults,
    eitherArrayIsAllRight,
    either.mapLeft((results) => SuiteError.as.TestRunError({ results }))
  );

const runTestsWithFilledDefaultConfig = (
  config: TestConfig
): ((testsTE: TaskEither<SuiteError, readonly Named<TestUnit>[]>) => Task<SuiteResult>) =>
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
