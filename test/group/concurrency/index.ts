import { test } from '@src';

import * as sequential from './sequential';
import * as time from './time';

export const tests = test.scope({ sequential, time });
