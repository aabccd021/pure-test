import { scope } from '@src';

import * as AssertionError from './AssertionError';
import * as SerializationError from './SerializationError';

export const tests = scope({ AssertionError, SerializationError });
