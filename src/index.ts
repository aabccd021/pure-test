import type { Change } from 'diff';
import { diffLines } from 'diff';
import {
  apply,
  boolean,
  console,
  either,
  io,
  readonlyArray,
  readonlyRecord,
  string,
  task,
  taskEither,
} from 'fp-ts';
import { flow, identity, pipe } from 'fp-ts/function';
import { withTimeout } from 'fp-ts-contrib/Task/withTimeout';
import * as retry from 'retry-ts';
import { retrying } from 'retry-ts/Task';
import { match } from 'ts-pattern';

export type RetryPolicy =
  | {
      readonly type: 'count';
      readonly value: number;
    }
  | {
      readonly type: 'policy';
      readonly value: retry.RetryPolicy;
    };

export type SingleTest<E = unknown, R = unknown> = {
  readonly type: 'single';
  readonly name: string;
  readonly expect: task.Task<E>;
  readonly shouldTimeout?: true;
  readonly toResult: R;
  readonly timeout?: number;
  readonly retry?: RetryPolicy;
};

export type SequentialTest<T = unknown> = {
  readonly type: 'sequential';
  readonly name: string;
  readonly tests: Record<
    string,
    {
      readonly expect: task.Task<T>;
      readonly toResult: T;
      readonly shouldTimeout?: true;
      readonly timeout?: number;
    }
  >;
};

export type Test = SequentialTest | SingleTest;

export const stringify = <A>(a: A): either.Either<unknown, string> =>
  either.tryCatch(() => JSON.stringify(a, undefined, 2), identity);

export type AssertError =
  | { readonly type: 'changes'; readonly changes: readonly Change[] }
  | { readonly type: 'stringify error'; readonly err: unknown }
  | { readonly type: 'task'; readonly err: unknown }
  | { readonly type: 'timeout' };

export type TestErr = {
  readonly name: string;
  readonly err: AssertError;
};

export const assert = (expected: unknown) => (actual: unknown) =>
  pipe(
    { expected, actual },
    readonlyRecord.map(stringify),
    apply.sequenceS(either.Apply),
    either.bimap(
      (err) => ({ type: 'stringify error' as const, err }),
      ({ expected: expectedStr, actual: actualStr }) => diffLines(expectedStr, actualStr)
    ),
    either.chainW(
      either.fromPredicate(
        readonlyArray.foldMap(boolean.MonoidAll)(
          (change) => change.added !== true && change.removed !== true
        ),
        (changes) => ({ type: 'changes' as const, changes })
      )
    )
  );

const runAssertion = <T>(test: {
  readonly name: string;
  readonly expect: task.Task<T>;
  readonly toResult: T;
  readonly shouldTimeout?: true;
  readonly timeout?: number;
}) =>
  pipe(
    taskEither.tryCatch(test.expect, identity),
    taskEither.mapLeft((err) => ({ type: 'task' as const, err })),
    taskEither.chainEitherKW(assert(test.toResult)),
    withTimeout(
      either.left<AssertError, unknown>({ type: 'timeout' as const }),
      test.timeout ?? 5000
    ),
    taskEither.mapLeft((err) => [{ name: test.name, err }])
  );

const colored = (prefix: string, color: string) => (change: Change) =>
  pipe(
    change.value,
    string.endsWith('\n'),
    boolean.match(
      () => change.value,
      () => string.slice(0, string.size(change.value) - 1)(change.value)
    ),
    string.split('\n'),
    readonlyArray.map((line) => `\x1b[${color}m${prefix}${line}\x1b[0m`),
    readonlyArray.intercalate(string.Monoid)(`\n`)
  );

export const coloredDiff = flow(
  readonlyArray.map((change: Change) =>
    match(change)
      .with({ added: true }, colored('+ ', '32'))
      .with({ removed: true }, colored('- ', '31'))
      .otherwise(colored('  ', '90'))
  ),
  readonlyArray.intercalate(string.Monoid)('\n')
);

const runTestWithoutRetry = (test: Test): taskEither.TaskEither<readonly TestErr[], unknown> =>
  match(test)
    .with({ type: 'single' }, runAssertion)
    .with({ type: 'sequential' }, (t) =>
      pipe(
        t.tests,
        readonlyRecord.mapWithIndex((subtestName, subTest) => ({
          ...subTest,
          name: `${t.name} > ${subtestName}`,
        })),
        readonlyRecord.traverse(taskEither.ApplicativeSeq)(runAssertion)
      )
    )
    .exhaustive();

const getRetryPolicy = (test: Test) =>
  match(test)
    .with({ type: 'single', retry: { type: 'policy' } }, (t) => t.retry.value)
    .with({ type: 'single', retry: { type: 'count' } }, (t) => retry.limitRetries(t.retry.value))
    .with({ type: 'single' }, () => retry.limitRetries(0))
    .with({ type: 'sequential' }, () => retry.limitRetries(0))
    .exhaustive();

export const runTest = (test: Test): taskEither.TaskEither<readonly TestErr[], unknown> =>
  retrying(getRetryPolicy(test), () => runTestWithoutRetry(test), either.isLeft);

export const runParallel = readonlyArray.sequence(task.ApplicativePar);

export const runSequential = readonlyArray.sequence(task.ApplicativeSeq);

// eslint-disable-next-line functional/no-return-void
export const setExitCode = (code: number) => () => {
  // eslint-disable-next-line functional/immutable-data, functional/no-expression-statement
  process.exitCode = code;
};

export const aggregateErrors = task.map(
  readonlyArray.sequence(either.getApplicativeValidation(readonlyArray.getSemigroup<TestErr>()))
);

export const colorizeChanges = taskEither.mapLeft(
  readonlyArray.map((err: TestErr) =>
    pipe(
      match(err.err)
        .with({ type: 'changes' }, ({ changes }) => coloredDiff(changes))
        .otherwise(identity),
      (newErr) => ({ ...err, err: newErr })
    )
  )
);

export const logErrors = (
  res: taskEither.TaskEither<readonly { readonly name: string; readonly err: unknown }[], unknown>
) =>
  pipe(
    res,
    taskEither.swap,
    taskEither.chainFirstIOK(
      readonlyArray.traverse(io.Applicative)((err) =>
        pipe(
          console.log(`\n${err.name}`),
          io.chain(() => console.error(err.err))
        )
      )
    ),
    taskEither.swap
  );

export const setExitCode1OnError = flow(
  taskEither.swap,
  taskEither.chainFirstIOK(() => setExitCode(1)),
  taskEither.swap
);

export const getTestTasks = readonlyArray.map(runTest);

export const runTests = flow(
  getTestTasks,
  runParallel,
  aggregateErrors,
  colorizeChanges,
  logErrors,
  setExitCode1OnError
);

export const runTestsSeq = flow(
  getTestTasks,
  runSequential,
  aggregateErrors,
  colorizeChanges,
  logErrors,
  setExitCode1OnError
);

export const testStrict = <T = unknown>(t: Omit<SingleTest<T, T>, 'type'>): SingleTest<T, T> => ({
  ...t,
  type: 'single',
});

export const test = (t: Omit<SingleTest, 'type'>): SingleTest => ({
  ...t,
  type: 'single',
});
