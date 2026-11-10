import express, { type Request } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { collect, MAX_BYTES } from './collect.js';
import { getContext, NO_STORE, type ContextEnv } from './context.js';

// The Node host serves /api/context, /api/collect, /health and, in
// production, the built page. No request logger is mounted, so the
// visitor's IP is never written to a log once a response is sent.

// Every setting the server reads comes from the process environment,
// the geolocation URL and the output keys alike, so one .env file
// configures the Node host the same way the hosted platforms do.
const env = process.env as ContextEnv;

const app = express();
app.disable('x-powered-by');

// Health checks get a plain answer that touches nothing else, so a
// container platform can tell the process is up without asking
// the geolocation provider anything about any visitor's address.
app.get('/health', (_req, res) => {
  res.set(NO_STORE);
  res.json({ ok: true });
});

// The context route passes the socket address only as a fallback for
// a missing X-Forwarded-For and answers with no-store, so the IP is
// used for this one response and is kept nowhere once it is sent.
app.get('/api/context', async (req, res) => {
  const ctx = await getContext({
    headers: req.headers,
    ip: req.socket.remoteAddress,
    env,
  });
  res.set(NO_STORE);
  res.json(ctx);
});

// Reads the request body as text and stops at the size limit, so an
// oversized batch is turned away without being read in full and no
// body parser error handler gets a chance to print it to a log.
function readBody(req: Request, limit: number): Promise<string | null> {
  return new Promise((resolve) => {
    if (Number(req.headers['content-length'] ?? 0) > limit) {
      resolve(null);
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    // Past the limit the reader stops listening and pauses the stream,
    // so the rest of the body is never buffered, and the route answers
    // 413 before the connection is closed once that answer is sent.
    const onData = (c: Buffer) => {
      size += c.length;
      if (size > limit) {
        req.off('data', onData);
        req.pause();
        resolve(null);
        return;
      }
      chunks.push(c);
    };
    req.on('data', onData);
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => resolve(null));
  });
}

// The collect route forwards the page's events to the enabled outputs.
// The body is capped at 64 KB, and the reply holds only the results,
// sent with no-store like every other answer from this server.
app.all('/api/collect', async (req, res) => {
  const body = req.method === 'POST' ? await readBody(req, MAX_BYTES) : '';
  if (body === null) {
    res.on('finish', () => req.destroy());
    res.status(413).set({ ...NO_STORE, Connection: 'close' }).json({ error: 'payload too large' });
    return;
  }
  const reply = await collect({ method: req.method, headers: req.headers, host: req.headers.host, body, ip: req.socket.remoteAddress, env });
  res.status(reply.status).set(NO_STORE).json(reply.body);
});

// In production the same process serves the built page. Unknown
// paths fall back to index.html, so a shared link with a hash
// for a section still loads the page and then scrolls down to it.
if (process.env.NODE_ENV === 'production') {
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { index: 'index.html' }));
    app.use((_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
}

// The port defaults to 3001, which the Vite dev server proxies /api to,
// and the startup line logs only that port, so nothing about any
// visitor is ever printed to the console while the process runs.
const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`[server] listening on :${port}`);
});
