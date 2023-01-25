import type { Named, TestSuccess } from '.';

export type Test = { readonly unit: 'test'; readonly value: TestSuccess };
export type Group = { readonly unit: 'group'; readonly results: readonly Named<TestSuccess>[] };

export type Union = Group | Test;
