import type { Assertion, SingleAssertionTest } from './type';

export const test = <T>(assert: Assertion<T, T>): SingleAssertionTest => ({
  assertion: 'single',
  assert,
});

export const testW = <A, B>(assert: Assertion<A, B>): SingleAssertionTest => ({
  assertion: 'single',
  assert,
});
