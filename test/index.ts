import { pipe } from 'fp-ts/function';

import * as src from '../src';
import * as logErrors from './logErrors';
import * as setExitCode from './setExitCode';
import * as shouldTimeout from './shouldTimeout';

const tests = [...logErrors.tests, ...setExitCode.tests, ...shouldTimeout.tests];

export const main = pipe(tests, src.runTests({}), src.logErrors, src.setExitCode);
