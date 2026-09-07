import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: '/vadstena/',
  define: {
    __YARD_DIAGNOSTICS__: JSON.stringify(command === 'serve'),
  },
  server: {
    host: '127.0.0.1',
    watch: { ignored: ['**/desktop/renderer/**', '**/release/**', '**/.playtest/**'] },
  },
  preview: { host: '127.0.0.1' },
}));
