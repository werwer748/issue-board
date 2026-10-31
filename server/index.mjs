import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { BadRequest, getDashboard } from './dashboard.mjs';

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(body));
}

export function createHandler(options = {}) {
  return async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname !== '/api/dashboard') {
        sendJson(res, 404, { error: 'Not found' });
        return;
      }
      if (req.method !== 'GET') {
        sendJson(res, 405, { error: 'Method not allowed' }, { Allow: 'GET' });
        return;
      }
      sendJson(res, 200, await getDashboard(url.searchParams, options));
    } catch (error) {
      sendJson(res, error instanceof BadRequest ? 400 : 500, {
        error: error instanceof BadRequest ? error.message : 'Unable to load dashboard',
      });
    }
  };
}

export function createApiServer(options = {}) {
  return createServer(createHandler(options));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 4174);
  createApiServer().listen(port, () => {
    console.log(`Dashboard API listening on port ${port}`);
  });
}

// Alias used by acceptance/contract.test.mjs
export { createApiServer as createServer };
