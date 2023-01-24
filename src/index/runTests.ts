import {
  apply,
  boolean,
  either,
  readonlyArray,
  readonlyNonEmptyArray,
  readonlyRecord,
  string,
  task,
  taskEither,
} from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { flow, pipe } from 'fp-ts/function';
import type { ReadonlyNonEmptyArray } from 'fp-ts/ReadonlyNonEmptyArray';
import type { Task } from 'fp-ts/Task';
import type { TaskEither } from 'fp-ts/TaskEither';
import * as iots from 'io-ts';
import * as retry from 'retry-ts';
import { retrying } from 'retry-ts/lib/Task';
import { modifyW } from 'spectacles-ts';
import { match } from 'ts-pattern';

import { diffLines } from './_internal/libs/diffLines';
import type {
  Assert,
  Change,
  Concurrency,
  LeftOf,
  SuiteResult,
  TestConfig,
  TestError,
  TestResult,
  TestUnit,
  TestUnitResult,
} from './type';

const serializeToLines =
  (path: readonly (number | string)[]) =>
  (obj: unknown): Either<TestError.SerializationError, ReadonlyNonEmptyArray<string>> =>
    typeof obj === 'boolean' || typeof obj === 'number' || typeof obj === 'string' || obj === null
      ? either.right([JSON.stringify(obj)])
      : obj === undefined
      ? either.right(['undefined'])
      : Array.isArray(obj)
      ? pipe(
          obj,
          readonlyArray.traverseWithIndex(either.Applicative)((k, v) =>
            serializeToLines([...path, k])(v)
          ),
          either.map(
            flow(
              readonlyArray.chain(readonlyNonEmptyArray.modifyLast((x) => `${x},`)),
              readonlyArray.map((x) => `  ${x}`),
              (xs) => [`[`, ...xs, `]`]
            )
          )
        )
      : pipe(
          obj,
          iots.UnknownRecord.decode,
          either.mapLeft(() => ({ code: 'SerializationError' as const, path })),
          either.chain(
            readonlyRecord.traverseWithIndex(either.Applicative)((k, v) =>
              serializeToLines([...path, k])(v)
            )
          ),
          either.map(
            flow(
              readonlyRecord.foldMapWithIndex(string.Ord)(readonlyArray.getMonoid<string>())(
                (k, v) =>
                  pipe(
                    v,
                    readonlyNonEmptyArray.modifyHead((x) => `"${k}": ${x}`),
                    readonlyNonEmptyArray.modifyLast((x) => `${x},`)
                  )
              ),
              readonlyArray.map((x) => `  ${x}`),
              (xs) => [`{`, ...xs, `}`]
            )
          )
        );

const hasAnyChange = readonlyArray.foldMap(boolean.MonoidAll)(
  (change: Change) => change.type === '0'
);

export const diffResult = ({
  received,
  expected,
}: {
  readonly received: unknown;
  readonly expected: unknown;
}) =>
  pipe(
    { received, expected },
    readonlyRecord.map(
      flow(serializeToLines([]), either.map(readonlyArray.intercalate(string.Monoid)('\n')))
    ),
    apply.sequenceS(either.Apply),
    either.map(diffLines),
    either.chainW(
      either.fromPredicate(hasAnyChange, (changes) => ({
        code: 'AssertionError' as const,
        changes,
        received,
        expected,
      }))
    )
  );

export const runAssert = (a: Assert.Union): Either<TestError.Union, unknown> =>
  match(a)
    .with({ assert: 'Equal' }, diffResult)
    .with({ assert: 'UnexpectedLeft' }, ({ value }) =>
      either.left({ value, code: 'UnexpectedLeft' as const })
    )
    .with({ assert: 'UnexpectedRight' }, ({ value }) =>
      either.left({ value, code: 'UnexpectedRight' as const })
    )
    .with({ assert: 'UnexpectedNone' }, () => either.left({ code: 'UnexpectedNone' as const }))
    .exhaustive();

const runSequentialFailFast =
  <T, L, R>(f: (t: T) => TaskEither<L, R>) =>
  (ts: readonly T[]): Task<readonly Either<L, R>[]> =>
    pipe(
      ts,
      readonlyArray.reduce(
        taskEither.of<readonly Either<L, R>[], readonly Either<L, R>[]>([]),
        (acc, el) =>
          pipe(
            acc,
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
  <T, L, R>(f: (t: T) => TaskEither<L, R>) =>
  ({
    failFast,
  }: {
    readonly failFast?: false;
  }): ((tests: readonly T[]) => Task<readonly Either<L, R>[]>) =>
    match(failFast)
      .with(undefined, () => runSequentialFailFast(f))
      .with(false, () => readonlyArray.traverse(task.ApplicativeSeq)(f))
      .exhaustive();

const runWithConcurrency = <T, L, R>({
  concurrency,
  run,
}: {
  readonly concurrency: Concurrency | undefined;
  readonly run: (t: T) => TaskEither<L, R>;
}): ((ts: readonly T[]) => Task<readonly Either<L, R>[]>) =>
  match(concurrency)
    .with(undefined, () => readonlyArray.traverse(task.ApplicativePar)(run))
    .with({ type: 'parallel' }, () => readonlyArray.traverse(task.ApplicativePar)(run))
    .with({ type: 'sequential' }, runSequential(run))
    .exhaustive();

const unhandledException = (exception: unknown) => ({
  code: 'UnhandledException' as const,
  exception,
});

const runWithTimeout =
  <T>(assertion: Pick<TestUnit.Test, 'timeout'>) =>
  (te: TaskEither<TestError.Union, T>) =>
    task
      .getRaceMonoid<Either<TestError.Union, T>>()
      .concat(
        te,
        pipe({ code: 'TimedOut' as const }, taskEither.left, task.delay(assertion.timeout ?? 5000))
      );

const runWithRetry =
  (test: Pick<TestUnit.Test, 'retry'>) =>
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

const runTest = (assertion: TestUnit.Test): Task<TestResult> =>
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

const runGroupTests = (config: Pick<TestUnit.Group, 'concurrency'>) =>
  runWithConcurrency({ concurrency: config.concurrency, run: runTest });

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

const runGroup = (test: TestUnit.Group): Task<TestUnitResult> =>
  pipe(
    test.asserts,
    runGroupTests({ concurrency: test.concurrency }),
    task.map(
      flow(
        eitherArrayIsAllRight,
        either.bimap(
          (results) => ({ name: test.name, error: { code: 'GroupError' as const, results } }),
          (results) => ({ unit: 'group', results })
        )
      )
    )
  );

const runTestUnit = (test: TestUnit.Union): Task<TestUnitResult> =>
  match(test)
    .with(
      { type: 'test' },
      flow(
        runTest,
        taskEither.bimap(
          modifyW('error', (value) => ({ code: 'TestError' as const, value })),
          (result) => ({ unit: 'test' as const, result })
        )
      )
    )
    .with({ type: 'group' }, runGroup)
    .exhaustive();

const aggregateTestResult = (testResults: readonly TestUnitResult[]): SuiteResult =>
  pipe(
    testResults,
    eitherArrayIsAllRight,
    either.mapLeft((results) => ({ type: 'TestRunError' as const, results }))
  );

export const runTests = (
  config: TestConfig
): ((tests: TaskEither<LeftOf<SuiteResult>, readonly TestUnit.Union[]>) => Task<SuiteResult>) =>
  taskEither.chain(
    flow(
      runWithConcurrency({ concurrency: config.concurrency, run: runTestUnit }),
      task.map(aggregateTestResult)
    )
  );
