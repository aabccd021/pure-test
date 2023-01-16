import { console } from 'fp-ts';

import { logErrorsF } from './logErrorsF';
import { runTests } from './runTests';
import { setExitCodeF } from './setExitCodeF';
import { strictType } from './strictType';
import { test } from './test';

export { logErrorsF, runTests, setExitCodeF, strictType, test };

export const logErrors = logErrorsF({ console });

export const setExitCode = setExitCodeF({ process });
