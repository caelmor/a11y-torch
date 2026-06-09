/**
 * a11y-torch — local dev server.
 *
 * Serves the repo over http://localhost:5174 and rebuilds the bundle
 * Run: npm run dev (stop with Ctrl+C)
 */

import * as esbuild from 'esbuild';

const PORT = 5174;

const ctx = await esbuild.context({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/a11y-torch.dev.js',
  format: 'iife',
  target: 'es2017',
  sourcemap: 'inline',
});

await ctx.watch();
const { port } = await ctx.serve({ servedir: '.', port: PORT });

console.log('a11y-torch dev server running:');
console.log(`  playground: http://localhost:${port}/dev/playground.html`);
console.log(`  bundle:     http://localhost:${port}/dist/a11y-torch.dev.js`);
console.log('Open the playground, click the dev bookmark, iterate. Ctrl+C to stop.');
