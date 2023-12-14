import { console } from 'fp-ts';

import { logResultF } from './logResultF';

export const logResult = logResultF({ console });
