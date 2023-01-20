import { either } from 'fp-ts';
import type { Either } from 'fp-ts/Either';

import type { AssertionError } from '../type';
import type { EitherLeft } from '../type';

export const runAssertion = (result: EitherLeft): Either<AssertionError, unknown> =>
  either.left({ code: 'EitherLeft', left: result.left });
