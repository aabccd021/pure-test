import type { Either } from 'fp-ts/Either';
import { match } from 'ts-pattern';

import type { Assert, AssertionError } from '../type';
import * as AssertEqual from './AssertEqual';
import * as EitherLeft from './EitherLeft';

export const runAssert = (a: Assert): Either<AssertionError, unknown> =>
  match(a)
    .with({ type: 'AssertEqual' }, AssertEqual.runAssertion)
    .with({ type: 'EitherLeft' }, EitherLeft.runAssertion)
    .exhaustive();
