import { scopeTests } from '@src';

import * as errorCode from './errorCode';
import * as invoked from './invoked';

export const tests = scopeTests({ errorCode, invoked });
