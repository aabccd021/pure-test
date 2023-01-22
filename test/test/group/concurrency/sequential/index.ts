import { test } from '@src';

import * as errorCode from './errorCode';
import * as invoked from './invoked';

export const tests = test.scope({ errorCode, invoked });
