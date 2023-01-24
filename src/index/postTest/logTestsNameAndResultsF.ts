import { either, readonlyArray, string, task } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import type { IO } from 'fp-ts/IO';
import type { Task } from 'fp-ts/Task';
import c from 'picocolors';
import { match } from 'ts-pattern';

import type { SuiteResult, TestResult, TestUnitResult } from '../type';

const skipped = (name: string) => `  ${c.dim(c.gray('↓'))} ${name}`;

const failed = (name: string) => `  ${c.red('×')} ${name}`;

const passed = (name: string) => `  ${c.green('✓')} ${name}`;

const testResultToStr = (assertionResult: TestResult): readonly string[] =>
  pipe(
    assertionResult,
    either.match(
      ({ name, error }) =>
        match(error)
          .with({ code: 'Skipped' }, () => [skipped(name)])
          .otherwise(() => [failed(name)]),
      ({ name }) => [passed(name)]
    )
  );

const testUnitResultToStr = (testResult: TestUnitResult): readonly string[] =>
  pipe(
    testResult,
    either.match(
      ({ name, error }) =>
        match(error)
          .with({ code: 'Skipped' }, () => [skipped(name)])
          .with({ code: 'GroupError' }, ({ results }) =>
            pipe(
              results,
              readonlyArray.chain(testResultToStr),
              readonlyArray.map((x) => `  ${x}`),
              readonlyArray.prepend(failed(name))
            )
          )
          .otherwise(() => [failed(name)]),
      ({ name }) => [passed(name)]
    )
  );

export const logTestsNameAndResultsF = (env: {
  readonly console: { readonly log: (str: string) => IO<void> };
}): ((res: Task<SuiteResult>) => Task<SuiteResult>) =>
  task.chainFirstIOK(
    flow(
      either.match(
        (suiteError) => (suiteError.type === 'TestRunError' ? suiteError.results : []),
        readonlyArray.map(either.right)
      ),
      readonlyArray.chain(testUnitResultToStr),
      readonlyArray.append(''),
      readonlyArray.intercalate(string.Monoid)('\n'),
      env.console.log
    )
  );
