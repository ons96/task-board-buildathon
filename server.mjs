import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)));
const publicRoot = resolve(join(projectRoot, 'public'));
const sourceRoot = resolve(join(projectRoot, 'src'));
const port = Number.parseInt(process.env.PORT || '4173', 10);
const host = process.env.HOST || '127.0.0.1';

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function isInsideRoot(candidate, root) {
  return candidate === root || candidate.startsWith(`${root}/`);
}

function filePathForRequest(requestUrl) {
  const requestPath = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  const relativePath = requestPath === '/' ? '/index.html' : requestPath;
  const root = relativePath.startsWith('/src/') ? sourceRoot : publicRoot;
  const candidate = normalize(join(root, relativePath));
  return isInsideRoot(candidate, root) ? candidate : null;
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Method not allowed');
    return;
  }

  let filePath;
  try {
    filePath = filePathForRequest(request.url || '/');
  } catch {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Bad request');
    return;
  }

  if (!filePath) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  try {
    const body = await readFile(filePath);
    const contentType = contentTypes[extname(filePath)] || 'application/octet-stream';
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Length': body.byteLength,
      'Content-Type': contentType,
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    const status = error.code === 'ENOENT' ? 404 : 500;
    response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(status === 404 ? 'Not found' : 'Internal server error');
  }
});

server.listen(port, host, () => {
  console.log(`Task Board running at http://${host}:${port}`);
});
