import { scope } from '@src';

import * as exitF from './exitF';
import * as logErrorDetailsF from './logErrorDetailsF';

export const tests = scope({ exitF, logErrorDetailsF });
