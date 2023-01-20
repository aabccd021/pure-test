import { readonlyArray } from 'fp-ts';

import * as sequential from './sequential';

export const tests = readonlyArray.flatten([sequential.tests]);
