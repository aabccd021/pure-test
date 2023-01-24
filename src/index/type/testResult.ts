import type { Either } from 'fp-ts/Either';

import type { TestUnitError } from '.';

export type Left = { readonly name: string; readonly error: TestUnitError.Type };

export type Right = { readonly name: string; readonly timeElapsedMs: number };

export type Type = Either<Left, Right>;
