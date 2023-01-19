import { console } from 'fp-ts';

import { logErrorDetailsF } from './logErrorDetailsF';

export const logErrorDetails = logErrorDetailsF({ console });
