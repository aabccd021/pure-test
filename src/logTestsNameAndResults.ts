import { console } from 'fp-ts';

import { logTestsNameAndResultsF } from './logTestsNameAndResultsF';

export const logTestsNameAndResults = logTestsNameAndResultsF({ console });
