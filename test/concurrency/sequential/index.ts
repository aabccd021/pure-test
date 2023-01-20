import { readonlyArray } from 'fp-ts';

import * as errorCode from './errorCode';
import * as invoked from './invoked';

export const tests = readonlyArray.flatten([errorCode.tests, invoked.tests]);
