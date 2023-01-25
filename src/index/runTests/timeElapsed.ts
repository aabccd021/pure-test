import { either, taskEither } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type { TaskEither } from 'fp-ts/TaskEither';

export type TimeElapsed<T> = { readonly timeElapsedMs: number; readonly result: T };

export const ofTaskEither =
  <L, R>(te: TaskEither<L, R>): TaskEither<L, TimeElapsed<R>> =>
  async () => {
    const start = performance.now();
    const resultE = await te();
    const timeElapsedMs = performance.now() - start;
    return pipe(
      resultE,
      either.map((result) => ({ timeElapsedMs, result }))
    );
  };

export const chainEitherKW = <L1, L2, R1, R2>(
  run: (t: R1) => Either<L2, R2>
): ((te: TaskEither<L1, TimeElapsed<R1>>) => TaskEither<L1 | L2, TimeElapsed<R2>>) =>
  taskEither.chainEitherKW(({ timeElapsedMs, result: oldResult }) =>
    pipe(
      oldResult,
      run,
      either.map((result) => ({ timeElapsedMs, result }))
    )
  );
