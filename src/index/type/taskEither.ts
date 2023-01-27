import { taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import type { TaskEither } from 'fp-ts/TaskEither';

import type { Named } from '.';
import { named } from '.';

export * from 'fp-ts/TaskEither';

export const bimapNamed =
  <T, L, R>(run: (t: T) => TaskEither<L, R>) =>
  (namedT: Named<T>) =>
    pipe(namedT.value, run, taskEither.bimap(named.of(namedT.name), named.of(namedT.name)));
