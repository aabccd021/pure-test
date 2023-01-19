import * as diff from 'diff';
import { readonlyArray, string } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import { match } from 'ts-pattern';

import type { DiffLines } from './type';

const removeLastNewLine = (str: string) =>
  string.endsWith('\n')(str)
    ? pipe(
        str,
        string.split(''),
        readonlyArray.dropRight(1),
        readonlyArray.intercalate(string.Monoid)('')
      )
    : str;

export const diffLines: DiffLines = ({ expected, actual }) =>
  pipe(
    diff.diffLines(expected, actual),
    readonlyArray.map((change) =>
      match(change)
        .with({ added: true }, ({ value }) => ({ type: '+' as const, value }))
        .with({ removed: true }, ({ value }) => ({ type: '-' as const, value }))
        .otherwise(({ value }) => ({ type: '0' as const, value }))
    ),
    readonlyArray.chain((change) =>
      pipe(
        change.value,
        removeLastNewLine,
        string.split('\n'),
        readonlyArray.map((value) => ({ type: change.type, value }))
      )
    )
  );
