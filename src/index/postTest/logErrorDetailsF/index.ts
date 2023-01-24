import { readonlyArray, string, taskEither } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import type { IO } from 'fp-ts/IO';
import type { Task } from 'fp-ts/Task';
import c from 'picocolors';
import { match } from 'ts-pattern';

import type { SuiteResult } from '../../type';
import { shardingErrorToContentLines } from './shardingErrorToContentLines';
import { testErrorToContentLines } from './testErrorToContentLines';

const suiteErrorToContentLines = (suiteError: SuiteResult.Left): readonly string[] =>
  match(suiteError)
    .with({ type: 'TestError' }, ({ results }) => testErrorToContentLines(results))
    .with({ type: 'DuplicateTestName' }, ({ name }) => [` Test name: ${name}`])
    .with({ type: 'ShardingError' }, ({ value }) => shardingErrorToContentLines(value))
    .exhaustive();

const suiteErrorToLines = (suiteError: SuiteResult.Left): readonly string[] =>
  pipe(
    suiteError,
    suiteErrorToContentLines,
    readonlyArray.map((line) => `  ${line}`),
    readonlyArray.prepend(`${c.red(c.bold(c.inverse(' ERROR ')))} ${suiteError.type}`)
  );

export const logErrorDetailsF = (env: {
  readonly console: { readonly log: (str: string) => IO<void> };
}): ((res: Task<SuiteResult.Type>) => Task<SuiteResult.Type>) =>
  flow(
    taskEither.swap,
    taskEither.chainFirstIOK(
      flow(suiteErrorToLines, readonlyArray.intercalate(string.Monoid)('\n'), env.console.log)
    ),
    taskEither.swap
  );
