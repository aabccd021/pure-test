import { assert, test } from '@src';
import { readonlyArray, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';

type Case = {
  readonly name: string;
  readonly act: unknown;
  readonly assert: unknown;
};

const caseToTest = (tc: Case) =>
  test({
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
    assert: 'foo',
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

export const tests = readonlyArray.map(caseToTest)(cases);
