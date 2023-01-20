import { console } from 'fp-ts';

import { logTestsNameAndResultsF } from './logTestsNameAndResultF';

export const logTestsNameAndResults = logTestsNameAndResultsF({ console });
