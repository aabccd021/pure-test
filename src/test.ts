import type { SingleAssertionTest } from './type';

export const test = (t: Omit<SingleAssertionTest, 'assertion'>): SingleAssertionTest => ({
  ...t,
  assertion: 'single',
});
