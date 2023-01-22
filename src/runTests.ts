import { either, number, readonlyArray, task, taskEither } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { flow, identity, pipe } from 'fp-ts/function';
import type { Task } from 'fp-ts/Task';
import type { TaskEither } from 'fp-ts/TaskEither';
import * as retry from 'retry-ts';
import { retrying } from 'retry-ts/lib/Task';
import { match } from 'ts-pattern';

import { getTestOrGroupName } from './getTestOrGroupName';
import { runAssert } from './runAssert';
import type {
  Assertion,
  AssertionError,
  AssertionPassResult,
  AssertionResult,
  Concurrency,
  Group,
  SuiteError,
  SuiteResult,
  TestConfig,
  TestOrGroup,
  TestPassResult,
  TestResult,
} from './type';

const runSequentialFailFast =
  <T, L, R>(f: (t: T) => TaskEither<L, R>, afterFail: (t: T) => Either<L, R>) =>
  (ts: readonly T[]): Task<readonly Either<L, R>[]> =>
    pipe(
      ts,
      readonlyArray.reduce(
        taskEither.of<readonly Either<L, R>[], readonly Either<L, R>[]>([]),
        (acc, el) =>
          pipe(
            acc,
            taskEither.mapLeft(readonlyArray.append<Either<L, R>>(afterFail(el))),
            taskEither.chain((accr) =>
              pipe(
                el,
                f,
                taskEither.bimap(
                  (ell): readonly Either<L, R>[] => [...accr, either.left(ell)],
                  (elr): readonly Either<L, R>[] => [...accr, either.right(elr)]
                )
              )
            )
          )
      ),
      taskEither.toUnion
    );

const runSequential =
  <T, L, R>(f: (t: T) => TaskEither<L, R>, afterFail: (t: T) => Either<L, R>) =>
  ({
    failFast,
  }: {
    readonly failFast?: false;
  }): ((tests: readonly T[]) => Task<readonly Either<L, R>[]>) =>
    match(failFast)
      .with(undefined, () => runSequentialFailFast(f, afterFail))
      .with(false, () => readonlyArray.traverse(task.ApplicativeSeq)(f))
      .exhaustive();

const runWithConcurrency = <T, L, R>({
  concurrency,
  run,
  afterFail,
}: {
  readonly concurrency: Concurrency | undefined;
  readonly run: (t: T) => TaskEither<L, R>;
  readonly afterFail: (t: T) => Either<L, R>;
}): ((ts: readonly T[]) => Task<readonly Either<L, R>[]>) =>
  match(concurrency)
    .with(undefined, () => readonlyArray.traverse(task.ApplicativePar)(run))
    .with({ type: 'parallel' }, () => readonlyArray.traverse(task.ApplicativePar)(run))
    .with({ type: 'sequential' }, runSequential(run, afterFail))
    .exhaustive();

const unhandledException = (exception: unknown) => ({
  code: 'unhandled exception' as const,
  exception,
});

const runWithTimeout =
  <T>(assertion: Pick<Assertion, 'timeout'>) =>
  (te: TaskEither<AssertionError, T>) =>
    task
      .getRaceMonoid<Either<AssertionError, T>>()
      .concat(
        te,
        pipe({ code: 'timed out' as const }, taskEither.left, task.delay(assertion.timeout ?? 5000))
      );

const runWithRetry =
  (test: Pick<Assertion, 'retry'>) =>
  <L, R>(te: TaskEither<L, R>) =>
    retrying(test.retry ?? retry.limitRetries(0), () => te, either.isLeft);

const measureElapsed =
  <A>(a: Task<A>): Task<{ readonly timeElapsedMs: number; readonly result: A }> =>
  async () => {
    const start = performance.now();
    const result = await a();
    const timeElapsedMs = performance.now() - start;
    return { result, timeElapsedMs };
  };

const runAssertion = (assertion: Assertion): Task<AssertionResult> =>
  pipe(
    taskEither.tryCatch(assertion.act, unhandledException),
    measureElapsed,
    task.map(({ timeElapsedMs, result }) =>
      pipe(
        result,
        either.chain(runAssert),
        either.map((newResult) => ({ timeElapsedMs, result: newResult }))
      )
    ),
    runWithTimeout({ timeout: assertion.timeout }),
    runWithRetry({ retry: assertion.retry }),
    taskEither.bimap(
      (error) => ({ name: assertion.name, error }),
      ({ timeElapsedMs }) => ({ timeElapsedMs, name: assertion.name })
    )
  );

const runAssertions = (config: Pick<Group, 'concurrency'>) =>
  runWithConcurrency({
    concurrency: config.concurrency,
    run: runAssertion,
    afterFail: (assertion) =>
      either.left({ name: assertion.name, error: { code: 'Skipped' as const } }),
  });

const runMultipleAssertion = (test: Group): Task<TestResult> =>
  pipe(
    test.asserts,
    runAssertions({ concurrency: test.concurrency }),
    task.map(
      flow(
        readonlyArray.reduce(
          either.of<readonly AssertionResult[], readonly AssertionPassResult[]>([]),
          (acc, el) =>
            pipe(
              acc,
              either.mapLeft(readonlyArray.append(el)),
              either.chain((accr) =>
                pipe(
                  el,
                  either.bimap(
                    (ell): readonly AssertionResult[] =>
                      pipe(
                        accr,
                        readonlyArray.map(either.right),
                        readonlyArray.append(either.left(ell))
                      ),
                    (elr): readonly AssertionPassResult[] => readonlyArray.append(elr)(accr)
                  )
                )
              )
            )
        ),
        either.bimap(
          (results) => ({
            name: test.name,
            error: { code: 'MultipleAssertionError' as const, results },
          }),
          flow(
            readonlyArray.map(({ timeElapsedMs }) => timeElapsedMs),
            readonlyArray.foldMap(number.MonoidSum)(identity),
            (timeElapsedMs) => ({ name: test.name, timeElapsedMs })
          )
        )
      )
    )
  );

const runTest = (test: TestOrGroup): Task<TestResult> =>
  match(test)
    .with({ type: 'test' }, ({ assert }) => runAssertion(assert))
    .with({ type: 'group' }, runMultipleAssertion)
    .exhaustive();

const aggregateTestResult = (testResults: readonly TestResult[]): SuiteResult =>
  pipe(
    testResults,
    readonlyArray.reduce(
      either.right<readonly TestResult[], readonly TestPassResult[]>([]),
      (acc, el) =>
        pipe(
          acc,
          either.mapLeft(readonlyArray.append(el)),
          either.chain((accr) =>
            pipe(
              el,
              either.bimap(
                (ell): readonly TestResult[] =>
                  pipe(
                    accr,
                    readonlyArray.map(either.right),
                    readonlyArray.append(either.left(ell))
                  ),
                (elr): readonly TestPassResult[] => [...accr, elr]
              )
            )
          )
        )
    ),
    either.mapLeft((results) => ({ type: 'TestError' as const, results }))
  );

export const runTests = (
  config: TestConfig
): ((tests: TaskEither<SuiteError, readonly TestOrGroup[]>) => Task<SuiteResult>) =>
  taskEither.chain(
    flow(
      runWithConcurrency({
        concurrency: config.concurrency,
        run: runTest,
        afterFail: (test) =>
          either.left({ name: getTestOrGroupName(test), error: { code: 'Skipped' as const } }),
      }),
      task.map(aggregateTestResult)
    )
  );
