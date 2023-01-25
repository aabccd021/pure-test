import { taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import type { TaskEither } from 'fp-ts/TaskEither';

export type Named<T> = { readonly name: string; readonly value: T };

export const of =
  <T>(name: string) =>
  (value: T): Named<T> => ({ name, value });

export const mapTaskEither =
  <T, L, R>(run: (t: T) => TaskEither<L, R>) =>
  (namedT: Named<T>) =>
    pipe(namedT.value, run, taskEither.bimap(of(namedT.name), of(namedT.name)));
