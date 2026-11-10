import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getContext, NO_STORE } from './context.js';

// The Node host serves /api/context, /health and, in production, the
// built page. No request logger is mounted, so the visitor's IP is
// never written to a log and is gone once the response has been sent.

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
    env: { GEO_PROVIDER_URL: process.env.GEO_PROVIDER_URL },
  });
  res.set(NO_STORE);
  res.json(ctx);
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
