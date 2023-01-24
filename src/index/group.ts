import type { TestUnit } from './type';

export const group = (g: Omit<TestUnit.Group, 'type'>): TestUnit.Group => ({ ...g, type: 'group' });
