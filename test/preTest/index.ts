import { test } from '@src';

import * as throwOnDuplicateTestName from './throwOnDuplicateTestName';

export const tests = test.scope({ throwOnDuplicateTestName });
