import { scopeTests } from '@src/index';

import * as errorCode from './errorCode';
import * as invoked from './invoked';

export const tests = scopeTests({ errorCode, invoked });
