import { either, ioOption, option, readonlyArray, string, task } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import type { IO } from 'fp-ts/IO';
import type { Option } from 'fp-ts/Option';
import type { Task } from 'fp-ts/Task';
import c from 'picocolors';

import type { SuiteResult, TestUnitResult } from '../type';

const testResultsToSummaryStr = (testResults: readonly TestUnitResult[]): Option<string> =>
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
    readonlyArray.intercalate(string.Monoid)('\n'),
    option.some
  );

export const logSummaryF = (env: {
  readonly console: { readonly log: (str: string) => IO<void> };
}): ((res: Task<SuiteResult>) => Task<SuiteResult>) =>
  task.chainFirstIOK(
    flow(
      either.match(
        (suiteError) =>
          suiteError.code === 'TestRunError'
            ? testResultsToSummaryStr(suiteError.results)
            : option.none,
        flow(readonlyArray.map(either.right), testResultsToSummaryStr)
      ),
      ioOption.fromOption,
      ioOption.chainIOK(env.console.log)
    )
  );
