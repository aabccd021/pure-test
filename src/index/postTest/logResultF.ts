import { either, readonlyArray, string, task } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import type { IO } from 'fp-ts/IO';
import type { Task } from 'fp-ts/Task';
import { match } from 'ts-pattern';

import type { LeftOf, SuiteResult, TestUnitSuccess } from '../type';

const testUnitSuccessResultToLines = (
  testUnitSuccessResult: TestUnitSuccess.Union
): readonly string[] =>
  match(testUnitSuccessResult)
    .with({ unit: 'test' }, () => [])
    .with({ unit: 'group' }, () => [])
    .exhaustive();

const suiteResultRightToLines = (
  testUnitSuccessResults: readonly TestUnitSuccess.Union[]
): readonly string[] =>
  pipe(testUnitSuccessResults, readonlyArray.chain(testUnitSuccessResultToLines));

const suiteResultLeftToLines = (suiteResultLeft: LeftOf<SuiteResult>): readonly string[] =>
  match(suiteResultLeft)
    .with({ type: 'TestRunError' }, () => [])
    .with({ type: 'ShardingError' }, () => [])
    .with({ type: 'DuplicateTestName' }, () => [])
    .exhaustive();

const resultToLines = (suiteResult: SuiteResult): readonly string[] =>
  pipe(suiteResult, either.match(suiteResultLeftToLines, suiteResultRightToLines));

const resultToString = (suiteResult: SuiteResult): string =>
  pipe(suiteResult, resultToLines, readonlyArray.intercalate(string.Monoid)('\n'));

export const logResultF =
  (env: { readonly console: { readonly log: (str: string) => IO<void> } }) =>
  (result: Task<SuiteResult>): Task<SuiteResult> =>
    pipe(result, task.chainFirstIOK(flow(resultToString, env.console.log)));
