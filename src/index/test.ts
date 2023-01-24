import type { TestUnit } from './type';

export const test = (g: Omit<TestUnit.SingleTest, 'type'>): TestUnit.SingleTest => ({
  ...g,
  type: 'single',
});
