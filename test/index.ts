import { pipe } from 'fp-ts/function';

import * as src from '../src';
import * as logErrors from './logErrors';
import * as setExitCode from './setExitCode';

const tests = [...logErrors.tests, ...setExitCode.tests];

export const main = pipe(tests, src.runTests({}), src.logErrors, src.setExitCode);
