import { either, ioOption, readonlyArray, string, task } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import type { IO } from 'fp-ts/IO';
import type { Task } from 'fp-ts/Task';
import c from 'picocolors';
import { match } from 'ts-pattern';

import type { Named, SuiteError, SuiteResult, TestUnitSuccess } from '../../type';
import { shardingErrorToLines } from './shardingErrorToLines';
import { testRunErrorToLines } from './testErrorToLines';

const suiteErrorToLines = (suiteError: SuiteError.Union): readonly string[] =>
  match(suiteError)
    .with({ code: 'TestRunError' }, testRunErrorToLines)
    .with({ code: 'DuplicateTestName' }, ({ name }) => [`Found duplicate test name: ${name}`])
    .with({ code: 'ShardingError' }, shardingErrorToLines)
    .exhaustive();

const suiteSuccessToLines = (
  suiteSuccess: readonly Named<TestUnitSuccess.Union>[]
): readonly string[] =>
  pipe(
    suiteSuccess,
    readonlyArray.map(({ name }) => ` ${c.green('✓')} ${name}`),
    readonlyArray.concat(['', `All ${readonlyArray.size(suiteSuccess)} tests passed`])
  );

export const logResultF = (env: {
  readonly console: { readonly log: (str: string) => IO<void> };
}): ((res: Task<SuiteResult>) => Task<SuiteResult>) =>
  task.chainFirstIOK(
    flow(
      either.match(suiteErrorToLines, suiteSuccessToLines),
      ioOption.fromPredicate(readonlyArray.isNonEmpty),
      ioOption.map(readonlyArray.intercalate(string.Monoid)('\n')),
      ioOption.chainIOK(env.console.log)
    )
  );
