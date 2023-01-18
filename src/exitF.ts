import { taskEither } from 'fp-ts';
import { flow } from 'fp-ts/function';
import type { IO } from 'fp-ts/IO';

export type Env = { readonly process: Pick<typeof process, 'exit'> };

export const exitF = (env: {
  readonly process: {
    readonly exit: (exitCode: number | undefined) => IO<void>;
  };
}) =>
  flow(
    taskEither.swap,
    taskEither.chainFirstIOK(() => env.process.exit(1)),
    taskEither.swap
  );
