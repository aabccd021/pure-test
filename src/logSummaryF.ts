import { readonlyArray, taskEither } from 'fp-ts';
import { flow } from 'fp-ts/function';
import type { IO } from 'fp-ts/IO';
import type { Task } from 'fp-ts/Task';

import type { SuiteResult } from './type';

export const logSummaryF = (env: {
  readonly console: { readonly log: (str: string) => IO<void> };
}): ((res: Task<SuiteResult>) => Task<SuiteResult>) =>
  taskEither.chainFirstIOK(
    flow(readonlyArray.size, (size) => `\nAll ${size} tests passed`, env.console.log)
  );
