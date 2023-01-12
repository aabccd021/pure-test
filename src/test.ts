import type { SingleAssertionTest } from './type';

export const test = (t: Omit<SingleAssertionTest, 'type'>): SingleAssertionTest => ({
  ...t,
  type: 'single',
});
