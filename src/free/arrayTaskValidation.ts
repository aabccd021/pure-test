import { task } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import type { TaskEither } from 'fp-ts/TaskEither';

import * as arrayValidation from '../pure/arrayValidation';

export const lift = <L, R>(te: TaskEither<L, R>) => pipe(te, task.map(arrayValidation.lift));

export const run = task.map(arrayValidation.run);
