import type { GroupTest } from './type';

export const group = (g: Omit<GroupTest, 'type'>): GroupTest => ({ ...g, type: 'group' });
