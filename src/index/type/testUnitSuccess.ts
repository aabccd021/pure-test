import type { RightOf, TestResult } from '.';

export type Test = { readonly unit: 'test'; readonly name: string; readonly timeElapsedMs: number };
export type Group = {
  readonly unit: 'group';
  readonly name: string;
  readonly results: readonly RightOf<TestResult>[];
};

export type Union = Group | Test;
