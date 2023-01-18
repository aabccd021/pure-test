import { console } from 'fp-ts';

import { logF } from './log';
import { runTests } from './runTests';
import { test } from './test';

export { logF, runTests, test };

export const log = logF({ console });
