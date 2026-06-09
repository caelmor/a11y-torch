/**
 * Regenerates install.html from the loader sources.
 */

import { transform } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

async function bookmarklet(srcPath) {
  const source = await readFile(join(root, srcPath), 'utf8');
  const { code } = await transform(source, { minify: true });
  return 'javascript:' + encodeURIComponent(code.trim());
}

const prodHref = await bookmarklet('loader/prod.js');
const devHref = await bookmarklet('loader/dev.js');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>a11y-torch — Install</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', monospace;
    background: #0f0f0f; color: #e8e8e8;
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 2rem;
  }
  .card { background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 2.5rem; max-width: 560px; width: 100%; }
  h1 { font-size: 1.4rem; letter-spacing: 0.15em; text-transform: uppercase; color: #4fc3f7; margin-bottom: 0.5rem; }
  p { color: #888; font-size: 0.9rem; margin-bottom: 1.5rem; line-height: 1.6; }
  .bookmarklet-btn {
    display: block; text-align: center; background: #4fc3f7; color: #0f0f0f;
    font-family: 'Courier New', monospace; font-weight: bold; font-size: 1rem;
    padding: 0.85rem 1.5rem; border-radius: 8px; text-decoration: none;
    letter-spacing: 0.05em; cursor: grab; border: 2px solid transparent;
    transition: all 0.2s; margin-bottom: 0.75rem;
  }
  .bookmarklet-btn:hover { background: #0f0f0f; color: #4fc3f7; border-color: #4fc3f7; }
  .bookmarklet-btn.dev { background: transparent; color: #888; border-color: #333; font-size: 0.8rem; padding: 0.5rem 1rem; }
  .bookmarklet-btn.dev:hover { color: #4fc3f7; border-color: #4fc3f7; }
  .steps { list-style: none; counter-reset: steps; margin-top: 1.5rem; }
  .steps li { counter-increment: steps; padding: 0.5rem 0 0.5rem 2.5rem; position: relative; font-size: 0.85rem; color: #aaa; border-bottom: 1px solid #222; }
  .steps li:last-child { border-bottom: none; }
  .steps li::before {
    content: counter(steps); position: absolute; left: 0; top: 0.5rem;
    background: #4fc3f7; color: #0f0f0f; width: 1.4rem; height: 1.4rem; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.75rem;
  }
  code { color: #4fc3f7; }
  .note { font-size: 0.75rem; color: #555; margin-top: 1.5rem; }
</style>
</head>
<body>
<div class="card">
  <h1>🔦 a11y-torch</h1>
  <p>Drag a button to your bookmarks bar, then click it on any page to launch.</p>

  <a class="bookmarklet-btn" href="${prodHref}">🔦 a11y-torch — Drag me to bookmarks bar</a>
  <a class="bookmarklet-btn dev" href="${devHref}">⚙ a11y-torch (dev) — always loads fresh</a>

  <ul class="steps">
    <li>Show your bookmarks bar: <strong>Ctrl+Shift+B</strong> (Win) / <strong>Cmd+Shift+B</strong> (Mac)</li>
    <li>Drag a button above into your bookmarks bar</li>
    <li>Visit any page and click the bookmark</li>
    <li>Click the bookmark again or <strong>✕ Close</strong> to exit</li>
  </ul>

  <p class="note">Generated from <code>loader/*.js</code> by <code>npm run make:install</code>. Do not edit by hand.</p>
</div>
</body>
</html>
`;

await writeFile(join(root, 'install.html'), html, 'utf8');
console.log('Wrote install.html');
