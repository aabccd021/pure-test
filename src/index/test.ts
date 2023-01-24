import type { SingleTest } from './type';

export const test = (g: Omit<SingleTest, 'type'>): SingleTest => ({ ...g, type: 'single' });
