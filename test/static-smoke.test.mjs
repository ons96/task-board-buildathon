import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

test('the offline app contains its required entry points', async () => {
  const [html, app, css, server] = await Promise.all([
    readFile(join(root, 'public/index.html'), 'utf8'),
    readFile(join(root, 'public/app.mjs'), 'utf8'),
    readFile(join(root, 'public/styles.css'), 'utf8'),
    readFile(join(root, 'server.mjs'), 'utf8'),
  ]);

  assert.match(html, /id="planner-form"/);
  assert.match(html, /id="board"/);
  assert.match(html, /id="evidence-content"/);
  assert.match(app, /transitionTask/);
  assert.match(app, /Local changes save automatically/);
  assert.match(css, /\.board-column/);
  assert.match(server, /createServer/);
  assert.doesNotMatch(app, /fetch\s*\(/);
});
