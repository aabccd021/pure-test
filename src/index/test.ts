import type { TestUnit } from './type';

export const test = (g: Omit<TestUnit.Test, 'type'>): TestUnit.Test => ({ ...g, type: 'test' });
