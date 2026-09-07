import { build } from 'vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
await build({
  root,
  configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)),
  base: '/',
  build: { outDir: 'desktop/renderer', emptyOutDir: true },
});
