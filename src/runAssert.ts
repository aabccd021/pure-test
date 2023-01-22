import { either } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { diffResult } from 'src/diffResult';
import { match } from 'ts-pattern';

import type { Assert, AssertionError } from './type';

export const runAssert = (a: Assert.Type): Either<AssertionError, unknown> =>
  match(a)
    .with({ assert: 'Equal' }, diffResult)
    .with({ assert: 'UnexpectedLeft' }, ({ value }) =>
      either.left({ value, code: 'UnexpectedLeft' as const })
    )
    .with({ assert: 'UnexpectedRight' }, ({ value }) =>
      either.left({ value, code: 'UnexpectedRight' as const })
    )
    .with({ assert: 'UnexpectedNone' }, () => either.left({ code: 'UnexpectedNone' as const }))
    .exhaustive();
