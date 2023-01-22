import process from 'node:process';

import { exitF } from 'src/index/postTest';

export const exit = exitF({ process: { exit: (exitCode) => () => process.exit(exitCode) } });
