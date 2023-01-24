import { scope } from '@src';

import * as either from './either';
import * as equal from './equal';

export const tests = scope({ equal, either });
