import { test } from '@src';

import * as group from './group';
import * as scope from './scope';

export const tests = test.scope({ group, scope });
