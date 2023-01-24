import type { AssertionError } from '@src';
import type { Either } from 'fp-ts/Either';

export type Left = { readonly name: string; readonly error: AssertionError.Type };

export type Right = { readonly name: string; readonly timeElapsedMs: number };

export type Type = Either<Left, Right>;
