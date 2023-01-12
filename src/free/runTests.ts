import { either, readonlyArray, task, taskEither } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type { Task } from 'fp-ts/Task';
import type { TaskEither } from 'fp-ts/TaskEither';
import { match } from 'ts-pattern';

import type { TestRunErrorResult, TestsWithConfig } from '../type';
import * as arrayTaskValidation from './arrayTaskValidation';
import { runTest } from './runTest';

export const aggregateErrors = <L, R>(testResults: Task<readonly Either<readonly L[], R>[]>) =>
  pipe(
    testResults,
    task.map(
      readonlyArray.sequence(either.getApplicativeValidation(readonlyArray.getSemigroup<L>()))
    )
  );

const runWithConcurrency = (config: Pick<TestsWithConfig, 'concurrency'>) =>
  match(config.concurrency)
    .with(undefined, () => readonlyArray.sequence(task.ApplicativePar))
    .with({ type: 'parallel' }, () => readonlyArray.sequence(task.ApplicativePar))
    .with({ type: 'sequential' }, () => readonlyArray.sequence(task.ApplicativeSeq))
    .exhaustive();

export const runTests = (
  testsWithConfig: TestsWithConfig
): TaskEither<readonly TestRunErrorResult[], undefined> =>
  pipe(
    testsWithConfig.tests,
    readonlyArray.map((test) =>
      pipe(
        test,
        runTest,
        taskEither.mapLeft((error) => ({ name: test.name, error })),
        arrayTaskValidation.lift
      )
    ),
    runWithConcurrency({ concurrency: testsWithConfig.concurrency }),
    arrayTaskValidation.run,
    taskEither.map(() => undefined)
  );
