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
import type { ReadonlyRecord } from 'fp-ts/ReadonlyRecord';
import type { Task } from 'fp-ts/Task';
import type { TaskEither } from 'fp-ts/TaskEither';
import * as iots from 'io-ts';
import { retrying } from 'retry-ts/lib/Task';
import { match } from 'ts-pattern';

import { concurrencyDefault } from './_internal/concurrencyDefault';
import { diffLines } from './_internal/libs/diffLines';
import type {
  Assert,
  Change,
  ConcurrencyConfigRequired,
  Named,
  SuiteError,
  SuiteResult,
  TestConfig,
  TestConfigRequired,
  TestError,
  TestResult,
  TestSuccess,
  TestUnit,
  TestUnitError,
  TestUnitResult,
} from './type';
import { named, suiteError, testError, testUnitError, testUnitSuccess } from './type';

const indent = (line: string): string => `  ${line}`;

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

const arrayToLines = (
  arr: readonly ReadonlyNonEmptyArray<string>[]
): ReadonlyNonEmptyArray<string> =>
  pipe(
    arr,
    readonlyArray.chain(readonlyNonEmptyArray.modifyLast((last) => `${last},`)),
    readonlyArray.map(indent),
    (lines) => [`[`, ...lines, `]`]
  );

const recordEntryToLines = (
  key: string,
  value: ReadonlyNonEmptyArray<string>
): ReadonlyNonEmptyArray<string> =>
  pipe(
    value,
    readonlyNonEmptyArray.modifyHead((head) => `"${key}": ${head}`),
    readonlyNonEmptyArray.modifyLast((last) => `${last},`)
  );

const recordFoldMapSortByKey = readonlyRecord.foldMapWithIndex(string.Ord);

const recordToLines = (
  record: ReadonlyRecord<string, ReadonlyNonEmptyArray<string>>
): ReadonlyNonEmptyArray<string> =>
  pipe(
    record,
    recordFoldMapSortByKey(readonlyArray.getMonoid<string>())(recordEntryToLines),
    readonlyArray.map(indent),
    (lines) => [`{`, ...lines, `}`]
  );

const unknownToLines =
  (path: readonly (number | string)[]) =>
  (obj: unknown): Either<TestError.SerializationError, ReadonlyNonEmptyArray<string>> =>
    typeof obj === 'boolean' || typeof obj === 'number' || typeof obj === 'string' || obj === null
      ? either.right([JSON.stringify(obj)])
      : obj === undefined
      ? either.right(['undefined'])
      : Array.isArray(obj)
      ? pipe(
          obj,
          readonlyArray.traverseWithIndex(either.Applicative)((index, value) =>
            unknownToLines([...path, index])(value)
          ),
          either.map(arrayToLines)
        )
      : pipe(
          obj,
          iots.UnknownRecord.decode,
          either.mapLeft(() => testError.serializationError(path)),
          either.chain(
            readonlyRecord.traverseWithIndex(either.Applicative)((index, value) =>
              unknownToLines([...path, index])(value)
            )
          ),
          either.map(recordToLines)
        );

const hasNoChange = readonlyArray.foldMap(boolean.MonoidAll)(
  (change: Change) => change.type === '0'
);

const serialize = (value: unknown): Either<TestError.SerializationError, string> =>
  pipe(value, unknownToLines([]), either.map(readonlyArray.intercalate(string.Monoid)('\n')));

export const assertEqual = ({
  received,
  expected,
}: {
  readonly received: unknown;
  readonly expected: unknown;
}): Either<TestError.AssertionError | TestError.SerializationError, readonly Change[]> =>
  pipe(
    { received, expected },
    readonlyRecord.map(serialize),
    apply.sequenceS(either.Apply),
    either.map(diffLines),
    either.chainW(
      either.fromPredicate(hasNoChange, (changes) =>
        testError.assertionError({ changes, received, expected })
      )
    )
  );

export const runAssert = (
  assert: Assert.Union
): Either<TestError.AssertionError | TestError.SerializationError, readonly Change[]> =>
  match(assert).with({ assert: 'Equal' }, assertEqual).exhaustive();

const runSequentialFailFast =
  <T, L, R>(run: (t: T) => TaskEither<L, R>) =>
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
                run,
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
  <T, L, R>(run: (t: T) => TaskEither<L, R>) =>
  (config: { readonly failFast: boolean }): ((ts: readonly T[]) => Task<readonly Either<L, R>[]>) =>
    config.failFast ? runSequentialFailFast(run) : readonlyArray.traverse(task.ApplicativeSeq)(run);

const runWithConcurrency = <T, L, R>({
  concurrency,
  run,
}: {
  readonly concurrency: ConcurrencyConfigRequired;
  readonly run: (t: T) => TaskEither<L, R>;
}): ((ts: readonly T[]) => Task<readonly Either<L, R>[]>) =>
  match(concurrency)
    .with({ type: 'parallel' }, () => readonlyArray.traverse(task.ApplicativePar)(run))
    .with({ type: 'sequential' }, runSequential(run))
    .exhaustive();

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

type WithTimeElapsed<T> = { readonly timeElapsedMs: number; readonly result: T };

const runWithMeasureElapsed =
  <L, R>(te: TaskEither<L, R>): TaskEither<L, WithTimeElapsed<R>> =>
  async () => {
    const start = performance.now();
    const resultE = await te();
    const timeElapsedMs = performance.now() - start;
    return pipe(
      resultE,
      either.map((result) => ({ timeElapsedMs, result }))
    );
  };

const measureElapsedChainEitherW = <L1, L2, R1, R2>(
  run: (t: R1) => Either<L2, R2>
): ((te: TaskEither<L1, WithTimeElapsed<R1>>) => TaskEither<L1 | L2, WithTimeElapsed<R2>>) =>
  taskEither.chainEitherKW(({ timeElapsedMs, result: oldResult }) =>
    pipe(
      oldResult,
      run,
      either.map((result) => ({ timeElapsedMs, result }))
    )
  );

const runTest = (test: TestUnit.Test): Task<TestResult> =>
  pipe(
    runWithMeasureElapsed(taskEither.tryCatch(test.act, testError.unhandledException)),
    measureElapsedChainEitherW(runAssert),
    runWithTimeout(test.timeout),
    runWithRetry(test.retry)
  );

const runTestNamed = (
  test: Named<TestUnit.Test>
): TaskEither<Named<TestError.Union>, Named<TestSuccess>> =>
  pipe(test.value, runTest, taskEither.bimap(named(test.name), named(test.name)));

const runGroupTests = (config: Pick<TestUnit.Group, 'concurrency'>) =>
  runWithConcurrency({ concurrency: config.concurrency, run: runTestNamed });

const runGroup = (group: TestUnit.Group) =>
  pipe(
    group.asserts,
    runGroupTests({ concurrency: group.concurrency }),
    task.map((testResults) => pipe(testResults, eitherArrayIsAllRight))
  );

const runTestUnit = (
  testUnit: TestUnit.Union
): TaskEither<TestUnitError.Union, testUnitSuccess.Union> =>
  match(testUnit)
    .with(
      { type: 'test' },
      flow(runTest, taskEither.bimap(testUnitError.testError, testUnitSuccess.test))
    )
    .with(
      { type: 'group' },
      flow(runGroup, taskEither.bimap(testUnitError.groupError, testUnitSuccess.group))
    )
    .exhaustive();

const runTestUnitNamed = (testUnit: Named<TestUnit.Union>) =>
  pipe(testUnit.value, runTestUnit, taskEither.bimap(named(testUnit.name), named(testUnit.name)));

const testUnitResultsToSuiteResult = (testUnitResults: readonly TestUnitResult[]): SuiteResult =>
  pipe(testUnitResults, eitherArrayIsAllRight, either.mapLeft(suiteError.testRunError));

export const runTestUnits =
  (config: TestConfigRequired) =>
  (tests: readonly Named<TestUnit.Union>[]): Task<SuiteResult> =>
    pipe(
      tests,
      runWithConcurrency({ concurrency: config.concurrency, run: runTestUnitNamed }),
      task.map(testUnitResultsToSuiteResult)
    );

export const runTestsWithFilledDefaultConfig =
  (config: TestConfigRequired) =>
  (testsTE: TaskEither<SuiteError.Union, readonly Named<TestUnit.Union>[]>): Task<SuiteResult> =>
    pipe(testsTE, taskEither.chain(runTestUnits(config)));

export const runTests = (config: TestConfig) =>
  runTestsWithFilledDefaultConfig({ concurrency: concurrencyDefault(config.concurrency) });
