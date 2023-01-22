import { test } from '@src';

import * as AssertionError from './AssertionError';
import * as SerializationError from './SerializationError';

export const tests = test.scope({
  AssertionError,
  SerializationError,
});
