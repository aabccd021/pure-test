import { console } from 'fp-ts';

import { logErrorsF } from './logErrorsF';
import { runTests } from './runTests';
import { setExitCodeF } from './setExitCodeF';

export { logErrorsF, runTests, setExitCodeF };

export const logErrors = logErrorsF({ console });

export const setExitCode = setExitCodeF({ process });
