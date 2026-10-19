// Loads the TypeScript worker through tsx (worker threads don't inherit tsx's loader).
import { tsImport } from 'tsx/esm/api';

await tsImport('./worker.ts', import.meta.url);
