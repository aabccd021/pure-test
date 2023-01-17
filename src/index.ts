import { console } from 'fp-ts';

import { logErrorsF } from './logErrorsF';
import { runTests } from './runTests';
import { test } from './test';

export { logErrorsF, runTests, test };

export const logErrors = logErrorsF({ console });
