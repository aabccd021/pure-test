import { scope } from '@src';

import * as either from './either';
import * as equal from './equal';
import * as numberArrayIsSortedAsc from './numberArrayIsSortedAsc';
import * as stringInLinesEqual from './stringInLinesEqual';

export const tests = scope({ equal, either, stringInLinesEqual, numberArrayIsSortedAsc });
