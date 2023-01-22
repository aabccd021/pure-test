import { console } from 'fp-ts';

import { logSummaryF } from './logSummaryF';

export const logSummary = logSummaryF({ console });
