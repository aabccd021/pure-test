import { either, ioOption, option, readonlyArray, string, task } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import type { IO } from 'fp-ts/IO';
import type { Option } from 'fp-ts/Option';
import type { Task } from 'fp-ts/Task';
import c from 'picocolors';
import { modify } from 'spectacles-ts';
import { match } from 'ts-pattern';

import type { SuiteResult, TestResult } from './type';

const testResultsToSummaryStr = (testResults: readonly TestResult[]): Option<string> =>
  pipe(
    testResults,
    readonlyArray.reduce({ passed: 0, failed: 0, skipped: 0 }, (summaryAcc, testResult) =>
      pipe(
        testResult,
        either.match(
          (failResult) =>
            failResult.error.code === 'Skipped'
              ? pipe(
                  summaryAcc,
                  modify('skipped', (x) => x + 1)
                )
              : pipe(
                  summaryAcc,
                  modify('failed', (x) => x + 1)
                ),
          () =>
            pipe(
              summaryAcc,
              modify('passed', (x) => x + 1)
            )
        )
      )
    ),
    ({ passed, failed, skipped }) => [
      c.bold(c.inverse(' DONE ')),
      c.bold(c.green(`   Passed ${passed}`)),
      c.bold(c.red(`   Failed ${failed}`)),
      c.bold(`  Skipped ${skipped}`),
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
          match(suiteError)
            .with({ type: 'DuplicateTestName' }, () => option.none)
            .with({ type: 'TestError' }, ({ results }) => testResultsToSummaryStr(results))
            .exhaustive(),
        flow(readonlyArray.map(either.right), testResultsToSummaryStr)
      ),
      ioOption.fromOption,
      ioOption.chainIOK(env.console.log)
    )
  );
