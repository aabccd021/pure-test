import type { Group } from './type';

export const group = (g: Omit<Group, 'type'>): Group => ({ ...g, type: 'group' });
