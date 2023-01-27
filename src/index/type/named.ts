import { taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import type { TaskEither } from 'fp-ts/TaskEither';

export type Named<T> = { readonly name: string; readonly value: T };

export const of =
  <T>(name: string) =>
  (value: T): Named<T> => ({ name, value });

export const mapTaskEither =
  <T, L, R>(namedT: Named<T>) =>
  (run: (t: T) => TaskEither<L, R>) =>
    pipe(namedT.value, run, taskEither.bimap(of(namedT.name), of(namedT.name)));
