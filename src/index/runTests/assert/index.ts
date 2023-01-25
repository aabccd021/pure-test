import type { Change } from 'diff';
import type { Either } from 'fp-ts/Either';
import { match } from 'ts-pattern';

import type { Assert, TestError } from '../../type';
import { equal } from './equal';

export const runAssert = (
  assert: Assert.Union
): Either<TestError.AssertionError | TestError.SerializationError, readonly Change[]> =>
  match(assert).with({ assert: 'Equal' }, equal).exhaustive();
