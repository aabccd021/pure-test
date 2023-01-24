import {
  apply,
  boolean,
  either,
  number,
  option,
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
import { match } from 'ts-pattern';

import { diffLines } from './_internal/libs/diffLines';
import type {
  Assert,
  AssertionError,
  AssertionResult,
  Change,
  Concurrency,
  SuiteResult,
  TestConfig,
  TestResult,
  TestUnit,
} from './type';

const serializeToLines =
  (path: readonly (number | string)[]) =>
  (obj: unknown): Either<AssertionError.SerializationError, ReadonlyNonEmptyArray<string>> =>
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

export const runAssert = (a: Assert.Type): Either<AssertionError.Type, unknown> =>
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
  code: 'UnhandledException' as const,
  exception,
});

const runWithTimeout =
  <T>(assertion: Pick<TestUnit.Test, 'timeout'>) =>
  (te: TaskEither<AssertionError.Type, T>) =>
    task
      .getRaceMonoid<Either<AssertionError.Type, T>>()
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

const runTest = (assertion: TestUnit.Test): Task<AssertionResult.Type> =>
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
  runWithConcurrency({
    concurrency: config.concurrency,
    run: runTest,
    afterFail: (assertion) =>
      either.left({ name: assertion.name, error: { code: 'Skipped' as const } }),
  });

const getMaxInNumberArray = flow(
  readonlyArray.sort(number.Ord),
  readonlyArray.last,
  option.getOrElse(() => 0)
);

const getTimeElapsedByConcurrency = ({
  concurrency,
}: {
  readonly concurrency?: Concurrency;
}): ((times: readonly number[]) => number) =>
  match(concurrency)
    .with(undefined, () => getMaxInNumberArray)
    .with({ type: 'parallel' }, () => getMaxInNumberArray)
    .with({ type: 'sequential' }, () => readonlyArray.foldMap(number.MonoidSum)((x: number) => x))
    .exhaustive();

const runGroup = (test: TestUnit.Group): Task<TestResult.Type> =>
  pipe(
    test.asserts,
    runGroupTests({ concurrency: test.concurrency }),
    task.map(
      flow(
        readonlyArray.reduce(
          either.of<readonly AssertionResult.Type[], readonly AssertionResult.Right[]>([]),
          (acc, el) =>
            pipe(
              acc,
              either.mapLeft(readonlyArray.append(el)),
              either.chain((accr) =>
                pipe(
                  el,
                  either.bimap(
                    (ell): readonly AssertionResult.Type[] =>
                      pipe(
                        accr,
                        readonlyArray.map(either.right),
                        readonlyArray.append(either.left(ell))
                      ),
                    (elr): readonly AssertionResult.Right[] => readonlyArray.append(elr)(accr)
                  )
                )
              )
            )
        ),
        either.bimap(
          (results) => ({
            name: test.name,
            error: { code: 'GroupError' as const, results },
          }),
          flow(
            readonlyArray.map(({ timeElapsedMs }) => timeElapsedMs),
            getTimeElapsedByConcurrency({ concurrency: test.concurrency }),
            (timeElapsedMs) => ({ name: test.name, timeElapsedMs })
          )
        )
      )
    )
  );

const runTestUnit = (test: TestUnit.Type): Task<TestResult.Type> =>
  match(test).with({ type: 'test' }, runTest).with({ type: 'group' }, runGroup).exhaustive();

const aggregateTestResult = (testResults: readonly TestResult.Type[]): SuiteResult.Type =>
  pipe(
    testResults,
    readonlyArray.reduce(
      either.right<readonly TestResult.Type[], readonly TestResult.Right[]>([]),
      (acc, el) =>
        pipe(
          acc,
          either.mapLeft(readonlyArray.append(el)),
          either.chain((accr) =>
            pipe(
              el,
              either.bimap(
                (ell): readonly TestResult.Type[] =>
                  pipe(
                    accr,
                    readonlyArray.map(either.right),
                    readonlyArray.append(either.left(ell))
                  ),
                (elr): readonly TestResult.Right[] => [...accr, elr]
              )
            )
          )
        )
    ),
    either.mapLeft((results) => ({ type: 'TestError' as const, results }))
  );

export const runTests = (
  config: TestConfig
): ((tests: TaskEither<SuiteResult.Left, readonly TestUnit.Type[]>) => Task<SuiteResult.Type>) =>
  taskEither.chain(
    flow(
      runWithConcurrency({
        concurrency: config.concurrency,
        run: runTestUnit,
        afterFail: ({ name }) => either.left({ name, error: { code: 'Skipped' as const } }),
      }),
      task.map(aggregateTestResult)
    )
  );
