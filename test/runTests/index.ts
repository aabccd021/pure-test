import { scopeTests } from '../../src';
import * as AssertionError from './AssertionError';
import * as SerializationError from './SerializationError';

export const tests = scopeTests({ AssertionError, SerializationError });
