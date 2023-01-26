import { either, ioOption, readonlyArray, string, task } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import type { IO } from 'fp-ts/IO';
import type { Task } from 'fp-ts/Task';
import c from 'picocolors';
import { match } from 'ts-pattern';

import type { SuiteError, SuiteResult, TestUnitResult } from '../type';
import { shardingErrorToContentLines } from './shardingErrorToContentLines';
import { testErrorToContentLines } from './testErrorToContentLines';

const testResultsToSummaryStr = (testResults: readonly TestUnitResult[]): string =>
  pipe(
    {
      passed: pipe(testResults, readonlyArray.rights, readonlyArray.size),
      failed: pipe(testResults, readonlyArray.lefts, readonlyArray.size),
    },
    (testCount) => [
      c.bold(c.inverse(' DONE ')),
      c.bold(c.green(`   Passed ${testCount.passed}`)),
      c.bold(c.red(`   Failed ${testCount.failed}`)),
      '',
    ],
    readonlyArray.intercalate(string.Monoid)('\n')
  );

const suiteErrorToContentLines = (suiteError: SuiteError.Union): readonly string[] =>
  match(suiteError)
    .with({ code: 'TestRunError' }, ({ results }) => testErrorToContentLines(results))
    .with({ code: 'DuplicateTestName' }, ({ name }) => [` Test name: ${name}`])
    .with({ code: 'ShardingError' }, ({ value }) => shardingErrorToContentLines(value))
    .exhaustive();

const suiteErrorToLines = (suiteError: SuiteError.Union): readonly string[] =>
  pipe(
    suiteError,
    suiteErrorToContentLines,
    readonlyArray.map((line) => `  ${line}`),
    readonlyArray.concat([
      ``,
      `${c.red(c.bold(c.inverse(' SUITE ERROR ')))} ${c.red(c.bold(suiteError.code))}`,
    ])
  );

export const logSummaryF = (env: {
  readonly console: { readonly log: (str: string) => IO<void> };
}): ((res: Task<SuiteResult>) => Task<SuiteResult>) =>
  task.chainFirstIOK(
    flow(
      either.match(suiteErrorToLines, (): readonly string[] => []),
      ioOption.fromPredicate(readonlyArray.isNonEmpty),
      ioOption.map(readonlyArray.intercalate(string.Monoid)('\n')),
      ioOption.chainIOK(env.console.log)
    )
  );
