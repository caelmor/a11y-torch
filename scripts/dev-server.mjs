/**
 * a11y-torch — local dev server.
 *
 * Serves the repo over http://localhost:8000 and rebuilds the bundle on every
 * request, so the dev loader always gets fresh code. No GitHub Pages, no certs,
 * no headers: run the bookmarklet on a page served from this same localhost
 * origin (the playground) and there is no mixed-content or Private Network
 * Access problem in any browser.
 *
 * Run: npm run dev   (stop with Ctrl+C)
 */
import * as esbuild from 'esbuild';

const PORT = 8000;

const ctx = await esbuild.context({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/a11y-torch.min.js',
  format: 'iife',
  target: 'es2017',
  sourcemap: 'inline',
});

await ctx.watch();
const { port } = await ctx.serve({ servedir: '.', port: PORT });

console.log('a11y-torch dev server running:');
console.log(`  playground: http://localhost:${port}/dev/playground.html`);
console.log(`  bundle:     http://localhost:${port}/dist/a11y-torch.min.js`);
console.log('Open the playground, click the dev bookmark, iterate. Ctrl+C to stop.');
