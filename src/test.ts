import type { Assertion, SingleAssertionTest } from './type';

export const test = <T = unknown>(assert: Assertion<T, T>): SingleAssertionTest => ({
  assertion: 'single',
  assert,
});

export const testW = <A = unknown, B = unknown>(assert: Assertion<A, B>): SingleAssertionTest => ({
  assertion: 'single',
  assert,
});
