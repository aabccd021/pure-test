import type { Named, TestUnit } from './type';

export const group = (
  g: Omit<TestUnit.Group, 'type'> & { readonly name: string }
): Named<TestUnit.Group> => ({ name: g.name, value: { ...g, type: 'group' } });
