import { readonlyArray } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import * as src from '../src';
import * as srcNode from '../src/node';
import * as exit from './exitF';
import * as log from './log';
import * as primitive from './primitive';
import * as timeout from './timeout';

const tests = [log.tests, exit.tests, timeout.tests, primitive.tests];

export const main = pipe(tests, readonlyArray.flatten, src.runTests({}), src.log, srcNode.exit);
