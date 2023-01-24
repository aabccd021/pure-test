import { either, readonlyArray, string, task } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import type { IO } from 'fp-ts/IO';
import type { Task } from 'fp-ts/Task';
import c from 'picocolors';
import { match } from 'ts-pattern';

import type { SuiteResult, TestUnitResult } from '../type';

const failed = (name: string) => `  ${c.red('×')} ${name}`;

const passed = (name: string) => `  ${c.green('✓')} ${name}`;

const testUnitResultToStr = (testUnitResult: TestUnitResult): readonly string[] =>
  pipe(
    testUnitResult,
    either.match(
      (testUnitError) =>
        match(testUnitError)
          .with({ code: 'GroupError' }, ({ results }) =>
            pipe(
              results,
              readonlyArray.chain(
                either.match(
                  (testResult) => [failed(testResult.name)],
                  (testResult) => [passed(testResult.name)]
                )
              ),
              readonlyArray.map((x) => `  ${x}`),
              readonlyArray.prepend(failed(testUnitError.name))
            )
          )
          .with({ code: 'TestError' }, () => [failed(testUnitError.name)])
          .exhaustive(),
      (result) =>
        match(result)
          .with({ unit: 'group' }, ({ results }) =>
            pipe(
              results,
              readonlyArray.map(({ name }) => passed(name))
            )
          )
          .with({ unit: 'test' }, ({ name }) => [passed(name)])
          .exhaustive()
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
