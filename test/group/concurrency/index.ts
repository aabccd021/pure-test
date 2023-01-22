import { scopeTests } from '@src';

import * as sequential from './sequential';
import * as time from './time';

export const tests = scopeTests({ sequential, time });
