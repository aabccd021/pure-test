import * as diff from 'diff';
import { readonlyArray, string } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import { match } from 'ts-pattern';

import type { Change, DiffLines } from '../../type';

const removeLastChar = (str: string) =>
  pipe(
    str,
    string.split(''),
    readonlyArray.dropRight(1),
    readonlyArray.intercalate(string.Monoid)('')
  );

const removeLastNewLine = (str: string) => (string.endsWith('\n')(str) ? removeLastChar(str) : str);

const adaptChange = (change: diff.Change): Change =>
  match(change)
    .with({ added: true }, ({ value }) => ({ type: '+' as const, value }))
    .with({ removed: true }, ({ value }) => ({ type: '-' as const, value }))
    .otherwise(({ value }) => ({ type: '0' as const, value }));

const mapChangeForEachLines = (change: Change): readonly Change[] =>
  pipe(
    change.value,
    removeLastNewLine,
    string.split('\n'),
    readonlyArray.map((value) => ({ type: change.type, value }))
  );

export const diffLines: DiffLines = ({ expected, received }) =>
  pipe(
    diff.diffLines(expected, received),
    readonlyArray.map(adaptChange),
    readonlyArray.chain(mapChangeForEachLines)
  );
