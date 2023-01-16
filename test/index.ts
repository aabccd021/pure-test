import { pipe } from 'fp-ts/function';

import * as src from '../src';
import * as logErrors from './logErrors';

const tests = [...logErrors.tests];

export const main = pipe(tests, src.runTests({}), src.logErrors, src.setExitCode);
