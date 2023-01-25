import { readonlyArray, string, task } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import type { IO } from 'fp-ts/IO';
import type { Task } from 'fp-ts/Task';

import type { SuiteResult } from '../type';

const resultToLines = (_suiteResult: SuiteResult): readonly string[] => [];

const resultToString = (suiteResult: SuiteResult): string =>
  pipe(suiteResult, resultToLines, readonlyArray.intercalate(string.Monoid)('\n'));

export const logResultF =
  (env: { readonly console: { readonly log: (str: string) => IO<void> } }) =>
  (result: Task<SuiteResult>): Task<SuiteResult> =>
    pipe(result, task.chainFirstIOK(flow(resultToString, env.console.log)));
