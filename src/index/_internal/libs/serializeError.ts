import type { Task } from 'fp-ts/Task';
import type { ErrorObject } from 'serialize-error';
import { dynamicImport } from 'tsimportlib';

export const serializeError =
  (error: unknown): Task<ErrorObject> =>
  async () => {
    const serializeErrorModule = (await dynamicImport(
      'serialize-error',
      module
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    )) as typeof import('serialize-error');
    return serializeErrorModule.serializeError(error);
  };
