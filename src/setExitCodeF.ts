import { taskEither } from 'fp-ts';
import { flow } from 'fp-ts/function';

export type Env = { readonly process: Pick<typeof process, 'exitCode'> };

export const setExitCodeF = (env: Env) =>
  flow(
    taskEither.swap,
    // eslint-disable-next-line functional/no-return-void
    taskEither.chainFirstIOK(() => () => {
      // eslint-disable-next-line functional/immutable-data, functional/no-expression-statement
      env.process.exitCode = 1;
    }),
    taskEither.swap
  );
