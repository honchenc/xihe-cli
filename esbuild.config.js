import * as esbuild from 'esbuild';

await Promise.all([
  esbuild.build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: 'dist/index.js',
    banner: {
      js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
    },
    external: [
      'ink',
      'react',
      'react-dom',
      'crypto',
      'http',
      'fs',
      'path',
      'os',
      'child_process',
      'util',
    ],
    sourcemap: true,
    minify: false,
  }),
  esbuild.build({
    entryPoints: ['src/interactive.tsx'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: 'dist/interactive.js',
    banner: {
      js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
    },
    external: [
      'ink',
      'react',
      'react-dom',
      'crypto',
      'http',
      'fs',
      'path',
      'os',
      'child_process',
      'util',
    ],
    sourcemap: true,
    minify: false,
  }),
]);
