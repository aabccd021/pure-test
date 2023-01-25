import { scope } from '@src';

import * as fail from './fail';
import * as pass from './pass';

export const tests = scope({ pass, fail });
