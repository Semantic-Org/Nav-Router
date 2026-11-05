import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const demoDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(demoDir, '..');
const routerSrcDir = path.join(repoRoot, 'src');
const integrationsDir = path.join(repoRoot, 'integrations');
// the packages a demo may import from node_modules, each served from its own folder
const mountedPackages = ['@semantic-ui/utils', 'solid-js'];

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] ?? 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
    });
    res.end(content);
  });
}

function resolveMountedPackage(pathname) {
  const under = (dir, prefix) => {
    const candidate = path.resolve(dir, `.${pathname.slice(prefix.length)}`);
    return candidate.startsWith(`${dir}${path.sep}`) ? candidate : null;
  };
  if (pathname.startsWith('/src/')) {
    return under(routerSrcDir, '/src');
  }
  if (pathname.startsWith('/integrations/')) {
    return under(integrationsDir, '/integrations');
  }
  const mounted = mountedPackages.find((name) => pathname.startsWith(`/node_modules/${name}/`));
  return mounted ? under(path.join(repoRoot, 'node_modules', mounted), `/node_modules/${mounted}`) : null;
}

export function createDemoServer({ pattern = 'flat' } = {}) {
  if (!['flat', 'nested', 'solid'].includes(pattern)) {
    throw new Error(`serve: unknown demo "${pattern}". Use "flat", "nested" or "solid".`);
  }

  const appRoot = path.join(demoDir, pattern);
  const indexHtml = path.join(appRoot, 'index.html');

  return http.createServer((req, res) => {
    if (!req.url || (req.method !== 'GET' && req.method !== 'HEAD')) {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed');
      return;
    }

    const parsedUrl = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(parsedUrl.pathname);

    const packageFile = resolveMountedPackage(pathname);
    if (packageFile) {
      sendFile(res, packageFile);
      return;
    }

    const candidate = path.resolve(appRoot, `.${pathname}`);
    if (candidate !== appRoot && !candidate.startsWith(`${appRoot}${path.sep}`)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    if (path.extname(pathname) !== '') {
      fs.stat(candidate, (err, stats) => {
        if (!err && stats.isFile()) {
          sendFile(res, candidate);
          return;
        }
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Asset not found: ${pathname}`);
      });
      return;
    }

    sendFile(res, indexHtml);
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const patternArg = args.find((arg, index) => !arg.startsWith('--') && args[index - 1] !== '--port');
  const pattern = patternArg || process.env.DEMO || 'flat';

  const portArgIndex = args.indexOf('--port');
  const cliPort = portArgIndex !== -1 ? Number(args[portArgIndex + 1]) : null;
  const port = cliPort || Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '127.0.0.1';

  const server = createDemoServer({ pattern });
  server.listen(port, host, () => {
    console.log(`nav-router (${pattern}) demo listening at http://${host}:${port}`);
  });
}
