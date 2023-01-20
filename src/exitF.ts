import { either, task } from 'fp-ts';
import { flow } from 'fp-ts/function';
import type { IO } from 'fp-ts/IO';
import type { Task } from 'fp-ts/Task';

import type { SuiteResult } from './type';

export type Env = { readonly process: Pick<typeof process, 'exit'> };

export const exitF = (env: {
  readonly process: {
    readonly exit: (exitCode: number | undefined) => IO<void>;
  };
}): ((res: Task<SuiteResult>) => Task<SuiteResult>) =>
  task.chainFirstIOK(
    flow(
      either.match(
        () => 1,
        () => 0
      ),
      env.process.exit
    )
  );
