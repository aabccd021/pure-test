import { scope } from '@src';

import * as either from './either';
import * as equal from './equal';
import * as stringInLinesEqual from './stringInLinesEqual.ts';

export const tests = scope({ equal, either, stringInLinesEqual });
