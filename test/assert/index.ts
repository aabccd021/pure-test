import { scope } from '@src';

import * as either from './either';
import * as equal from './equal';
import * as stringInLinesEqual from './stringInLinesEqual.ts';
import * as numberArrayIsSortedAsc from './numberArrayIsSortedAsc';

export const tests = scope({ equal, either, stringInLinesEqual, numberArrayIsSortedAsc });
