import { readonlyArray, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import { assert, group } from '../src';

type Case = {
  readonly name: string;
  readonly act: unknown;
  readonly assert: unknown;
};

const caseToTest = (tc: Case) => ({
  name: tc.name,
  act: pipe(tc.act, assert.equal(tc.assert), task.of),
});

const cases: readonly Case[] = [
  {
    name: 'should be able to compare between undefined',
    act: undefined,
    assert: undefined,
  },
  {
    name: 'should be able to compare null',
    act: null,
    assert: null,
  },
  {
    name: 'should be able to compare string',
    act: 'foo',
    assert: 'bar',
  },
  {
    name: 'should be able to compare number',
    act: 10,
    assert: 10,
  },
  {
    name: 'should be able to compare object with number index',
    act: { 1: 1 },
    assert: { 1: 1 },
  },
  {
    name: 'should be able to compare boolean',
    act: true,
    assert: true,
  },
];

export const tests = [
  group({
    name: 'primitive2',
    asserts: readonlyArray.map(caseToTest)(cases),
  }),
];
