import { scope } from '@src';

import * as AssertionError from './AssertionError';
import * as SerializationError from './SerializationError';
import * as UnhandledException from './UnhandledExeption';

export const tests = scope({ AssertionError, SerializationError, UnhandledException });
