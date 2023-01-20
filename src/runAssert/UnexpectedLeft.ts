import { either } from 'fp-ts';
import type { Either } from 'fp-ts/Either';

import type { AssertionError } from '../type';
import type { UnexpectedLeft } from '../type';

export const runAssertion = (result: UnexpectedLeft): Either<AssertionError, unknown> =>
  either.left({ code: 'UnexpectedLeft', left: result.value });
