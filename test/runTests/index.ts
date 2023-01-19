import { readonlyArray } from 'fp-ts';

import * as AssertionError from './AssertionError';

export const tests = readonlyArray.flatten([AssertionError.tests]);
