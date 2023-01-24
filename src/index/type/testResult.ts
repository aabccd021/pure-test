import type { Either } from 'fp-ts/Either';

import type { TestError } from '.';

export type Left = { readonly name: string; readonly error: TestError };

export type Right = { readonly name: string; readonly timeElapsedMs: number };

export type Type = Either<Left, Right>;
