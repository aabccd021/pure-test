import { either } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { match } from 'ts-pattern';

import type { Assert, AssertionError } from '../type';
import * as AssertEqual from './AssertEqual';

export const runAssert = (a: Assert): Either<AssertionError, unknown> =>
  match(a)
    .with({ type: 'AssertEqual' }, AssertEqual.runAssertion)
    .with({ type: 'UnexpectedLeft' }, ({ value }) =>
      either.left({ value, code: 'UnexpectedLeft' as const })
    )
    .with({ type: 'UnexpectedRight' }, ({ value }) =>
      either.left({ value, code: 'UnexpectedRight' as const })
    )
    .with({ type: 'UnexpectedNone' }, () => either.left({ code: 'UnexpectedNone' as const }))
    .exhaustive();
