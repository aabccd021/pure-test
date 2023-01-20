import { either, readonlyArray, string, task } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import type { IO } from 'fp-ts/IO';
import type { Task } from 'fp-ts/Task';
import * as c from 'picocolors';

import type { TestResult } from './type';

const testResultToStr = (testResult: TestResult): string =>
  pipe(
    testResult,
    either.match(
      ({ name, error }) =>
        error.code === 'Skipped' ? `  ${c.dim(c.gray('↓'))} ${name}` : `  ${c.red('×')} ${name}`,
      ({ name }) => `  ${c.green('✓')} ${name}`
    )
  );

export const logTestsNameAndResultsF = (env: {
  readonly console: { readonly log: (str: string) => IO<void> };
}): ((res: Task<readonly TestResult[]>) => Task<readonly TestResult[]>) =>
  task.chainFirstIOK(
    flow(
      readonlyArray.map(testResultToStr),
      readonlyArray.intercalate(string.Monoid)('\n'),
      env.console.log
    )
  );
