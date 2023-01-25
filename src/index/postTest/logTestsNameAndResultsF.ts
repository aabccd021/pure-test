import { either, readonlyArray, string, task } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import type { IO } from 'fp-ts/IO';
import type { Task } from 'fp-ts/Task';
import c from 'picocolors';
import { match } from 'ts-pattern';

import type { Named, SuiteResult, TestUnitLeft, TestUnitResult, TestUnitSuccess } from '../type';

const failed = (name: string) => `  ${c.red('×')} ${name}`;

const passed = (name: string) => `  ${c.green('✓')} ${name}`;

const testUnitResultToStr = (testUnitResult: TestUnitResult): readonly string[] =>
  pipe(
    testUnitResult,
    either.match(
      (testUnitLeft: TestUnitLeft): readonly string[] =>
        match(testUnitLeft.value)
          .with({ code: 'GroupError' }, (groupError): readonly string[] =>
            pipe(
              groupError.results,
              readonlyArray.chain(
                either.match(
                  (testResult) => [failed(testResult.name)],
                  (testResult) => [passed(testResult.name)]
                )
              ),
              readonlyArray.map((x: string) => `  ${x}`),
              readonlyArray.prepend(failed(testUnitLeft.name))
            )
          )
          .with({ code: 'TestError' }, (): readonly string[] => [failed(testUnitLeft.name)])
          .exhaustive(),
      (testUnitRight: Named<TestUnitSuccess.Union>): readonly string[] =>
        match(testUnitRight.value)
          .with({ unit: 'group' }, ({ results }): readonly string[] =>
            pipe(
              results,
              readonlyArray.map(() => passed(testUnitRight.name))
            )
          )
          .with({ unit: 'test' }, (): readonly string[] => [passed(testUnitRight.name)])
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
