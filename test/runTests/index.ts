import { readonlyArray } from 'fp-ts';

import * as AssertionError from './AssertionError';
import * as SerializationError from './SerializationError';

export const tests = readonlyArray.flatten([AssertionError.tests, SerializationError.tests]);
