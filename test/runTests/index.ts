import { scopeTests } from '@src/index';

import * as AssertionError from './AssertionError';
import * as SerializationError from './SerializationError';

export const tests = scopeTests({ AssertionError, SerializationError });
