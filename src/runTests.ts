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
import { match } from 'ts-pattern';

import { diffLines } from './diffLines';
import type {
  Assertion,
  AssertionError,
  AssertionResult,
  Change,
  Concurrency,
  MultipleAssertionTest,
  SerializationError,
  Test,
  TestConfig,
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
            taskEither.chain((accr) =>
              pipe(
                el,
                f,
                taskEither.bimap(
                  (ell): readonly Either<L, R>[] => [...accr, either.left(ell)],
                  (elr): readonly Either<L, R>[] => [...accr, either.right(elr)]
                )
              )
            ),
            taskEither.mapLeft(readonlyArray.append<Either<L, R>>(afterFail(el)))
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

const run = <T, L, R>(
  concurrency: Concurrency | undefined,
  f: (t: T) => TaskEither<L, R>,
  afterFail: (t: T) => Either<L, R>
): ((ts: readonly T[]) => Task<readonly Either<L, R>[]>) =>
  match(concurrency)
    .with(undefined, () => readonlyArray.traverse(task.ApplicativePar)(f))
    .with({ type: 'parallel' }, () => readonlyArray.traverse(task.ApplicativePar)(f))
    .with({ type: 'sequential' }, runSequential(f, afterFail))
    .exhaustive();

const hasAnyChange = readonlyArray.foldMap(boolean.MonoidAll)((diff: Change) => diff.type === '0');

const assertionFailed =
  (result: { readonly expected: unknown; readonly actual: unknown }) =>
  (diff: readonly Change[]) => ({
    code: 'AssertionError' as const,
    diff,
    actual: result.actual,
    expected: result.expected,
  });

const serializeToLines =
  (path: readonly (number | string)[]) =>
  (obj: unknown): Either<SerializationError, ReadonlyNonEmptyArray<string>> =>
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
              readonlyArray.flatten,
              readonlyArray.map((x) => `  ${x},`),
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

const serialize = flow(
  serializeToLines([]),
  either.map(readonlyArray.intercalate(string.Monoid)('\n'))
);

const assertEqual = (result: { readonly expected: unknown; readonly actual: unknown }) =>
  pipe(
    result,
    readonlyRecord.map(serialize),
    apply.sequenceS(either.Apply),
    either.map(diffLines),
    either.chainW(either.fromPredicate(hasAnyChange, assertionFailed(result)))
  );

const unhandledException = (exception: unknown) => ({
  code: 'unhandled exception' as const,
  exception,
});

const runActualAndAssert = (param: {
  readonly actualTask: Task<unknown>;
  readonly expectedResult: unknown;
}) =>
  pipe(
    taskEither.tryCatch(param.actualTask, unhandledException),
    taskEither.chainEitherKW((actual) => assertEqual({ actual, expected: param.expectedResult }))
  );

const runWithTimeout =
  (assertion: Pick<Assertion, 'timeout'>) => (te: TaskEither<AssertionError, unknown>) =>
    task
      .getRaceMonoid<Either<AssertionError, unknown>>()
      .concat(
        te,
        pipe({ code: 'timed out' as const }, taskEither.left, task.delay(assertion.timeout ?? 5000))
      );

const runWithRetry =
  (test: Pick<Assertion, 'retry'>) =>
  <L, R>(te: TaskEither<L, R>) =>
    retrying(test.retry ?? retry.limitRetries(0), () => te, either.isLeft);

const runAssertion = (assertion: Assertion): Task<AssertionResult> =>
  pipe(
    runActualAndAssert({ actualTask: assertion.act, expectedResult: assertion.assert }),
    runWithTimeout({ timeout: assertion.timeout }),
    runWithRetry({ retry: assertion.retry }),
    taskEither.bimap(
      (error) => ({ name: assertion.name, error }),
      () => ({ name: assertion.name })
    )
  );

const runAssertions = (config: Pick<MultipleAssertionTest, 'concurrency'>) =>
  run(config.concurrency, runAssertion, (assertion) =>
    either.left({ name: assertion.name, error: { code: 'Skipped' as const } })
  );

const runMultipleAssertion = (test: MultipleAssertionTest): Task<TestResult> =>
  pipe(
    test.asserts,
    runAssertions({ concurrency: test.concurrency }),
    task.map(
      flow(
        readonlyArray.reduce(
          either.of<readonly AssertionResult[], readonly AssertionResult[]>([]),
          (acc, el) =>
            pipe(
              acc,
              either.chain((accr) =>
                pipe(
                  el,
                  either.bimap(
                    (ell): readonly AssertionResult[] => [...accr, either.left(ell)],
                    (elr): readonly AssertionResult[] => [...accr, either.right(elr)]
                  )
                )
              ),
              either.mapLeft(readonlyArray.append(el))
            )
        ),
        either.bimap(
          (results) => ({
            name: test.name,
            error: { code: 'MultipleAssertionError' as const, results },
          }),
          () => ({ name: test.name })
        )
      )
    )
  );

const runTest = (test: Test): Task<TestResult> =>
  match(test)
    .with({ assertion: 'single' }, ({ assert }) => runAssertion(assert))
    .with({ assertion: 'multiple' }, runMultipleAssertion)
    .exhaustive();

const getTestName = (test: Test): string =>
  match(test)
    .with({ assertion: 'single' }, ({ assert }) => assert.name)
    .with({ assertion: 'multiple' }, ({ name }) => name)
    .exhaustive();

export const runTests = (
  config: TestConfig
): ((tests: readonly Test[]) => Task<readonly TestResult[]>) =>
  run(config.concurrency, runTest, (test) =>
    either.left({ name: getTestName(test), error: { code: 'Skipped' as const } })
  );
