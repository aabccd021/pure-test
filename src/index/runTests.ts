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
import * as retry from 'retry-ts';
import { retrying } from 'retry-ts/lib/Task';
import { match } from 'ts-pattern';

import { diffLines } from './_internal/libs/diffLines';
import type {
  Assert,
  Change,
  Concurrency,
  SuiteError,
  SuiteResult,
  TestConfig,
  TestError,
  TestResult,
  TestUnit,
  TestUnitError,
  TestUnitResult,
  TestUnitSuccess,
} from './type';

const indent = (line: string): string => `  ${line}`;

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

const traverseEitherArrayWithIndex = readonlyArray.traverseWithIndex(either.Applicative);

const traverseEitherRecordWithIndex = readonlyRecord.traverseWithIndex(either.Applicative);

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
          traverseEitherArrayWithIndex((index, value) => unknownToLines([...path, index])(value)),
          either.map(arrayToLines)
        )
      : pipe(
          obj,
          iots.UnknownRecord.decode,
          either.mapLeft(() => ({ code: 'SerializationError' as const, path })),
          either.chain(
            traverseEitherRecordWithIndex((index, value) => unknownToLines([...path, index])(value))
          ),
          either.map(recordToLines)
        );

const hasNoChange = readonlyArray.foldMap(boolean.MonoidAll)(
  (change: Change) => change.type === '0'
);

const assertionError =
  ({ received, expected }: { readonly received: unknown; readonly expected: unknown }) =>
  (changes: readonly Change[]) => ({
    code: 'AssertionError' as const,
    changes,
    received,
    expected,
  });

const serialize = (value: unknown): Either<TestError.SerializationError, string> =>
  pipe(value, unknownToLines([]), either.map(readonlyArray.intercalate(string.Monoid)('\n')));

export const diffResult = (result: { readonly received: unknown; readonly expected: unknown }) =>
  pipe(
    result,
    readonlyRecord.map(serialize),
    apply.sequenceS(either.Apply),
    either.map(diffLines),
    either.chainW(either.fromPredicate(hasNoChange, assertionError(result)))
  );

export const runAssert = (assert: Assert.Union): Either<TestError.Union, unknown> =>
  match(assert).with({ assert: 'Equal' }, diffResult).exhaustive();

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

const runGroup = (group: TestUnit.Group): Task<TestUnitResult> =>
  pipe(
    group.asserts,
    runGroupTests({ concurrency: group.concurrency }),
    task.map(
      flow(
        eitherArrayIsAllRight,
        either.bimap(
          (results): TestUnitError.Union => ({
            name: group.name,
            code: 'GroupError' as const,
            results,
          }),
          (results) => ({ unit: 'group', name: group.name, results })
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
          ({ name, error }): TestUnitError.Union => ({
            code: 'TestError' as const,
            name,
            value: error,
          }),
          ({ name, timeElapsedMs }): TestUnitSuccess.Union => ({
            unit: 'test' as const,
            name,
            timeElapsedMs,
          })
        )
      )
    )
    .with({ type: 'group' }, runGroup)
    .exhaustive();

const aggregateTestResult: (testUnitResult: readonly TestUnitResult[]) => SuiteResult = flow(
  eitherArrayIsAllRight,
  either.mapLeft((results) => ({ type: 'TestRunError' as const, results }))
);

export const runTests = (
  config: TestConfig
): ((tests: TaskEither<SuiteError.Union, readonly TestUnit.Union[]>) => Task<SuiteResult>) =>
  taskEither.chain(
    flow(
      runWithConcurrency({ concurrency: config.concurrency, run: runTestUnit }),
      task.map(aggregateTestResult)
    )
  );
