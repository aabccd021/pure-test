import { boolean, either, readonlyArray, task, taskOption } from 'fp-ts';
import { flow } from 'fp-ts/function';
import type { IO } from 'fp-ts/IO';
import type { Task } from 'fp-ts/Task';

import type { TestResult } from './type';

export type Env = { readonly process: Pick<typeof process, 'exit'> };

export const exitF = (env: {
  readonly process: {
    readonly exit: (exitCode: number | undefined) => IO<void>;
  };
}): ((res: Task<readonly TestResult[]>) => Task<readonly TestResult[]>) =>
  task.chainFirstIOK(
    flow(
      taskOption.fromPredicate(readonlyArray.foldMap(boolean.MonoidAny)(either.isLeft)),
      taskOption.chainIOK(() => env.process.exit(1))
    )
  );
