import { test } from '@src';

import * as concurrency from './concurrency';
import * as error from './error';
import * as retry from './retry';
import * as timeout from './timeout';

export const tests = test.scope({ error, concurrency, retry, timeout });
