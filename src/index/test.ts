import type { Named, TestUnit } from './type';

export const test = (
  g: Omit<TestUnit.Test, 'type'> & { readonly name: string }
): Named<TestUnit.Test> => ({ name: g.name, value: { ...g, type: 'test' } });
