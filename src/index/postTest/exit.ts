import { either, task } from 'fp-ts';
import { flow } from 'fp-ts/function';
import type { Task } from 'fp-ts/Task';

import type { Env, SuiteResult } from '../type';

export const exit = (env: Pick<Env, 'exit'>): ((res: Task<SuiteResult>) => Task<SuiteResult>) =>
  task.chainFirstIOK(
    flow(
      either.match(
        () => 1,
        () => 0
      ),
      env.exit
    )
  );
