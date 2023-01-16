import type { Assertion } from './type';

export const strictType = <T>(a: Assertion<T, T>) => a;
