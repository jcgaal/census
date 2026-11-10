import { httpUrl, postJson, type CollectEvent, type Output, type OutputEnv } from './types.js';

// HMAC-SHA256 of the exact body text, as lowercase hex. It uses Web
// Crypto, which Node, Vercel and Cloudflare all provide, so the same
// code signs the request on every host this project deploys to.
async function hmacHex(secret: string, text: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// The webhook posts { events } to any URL. With a secret it signs the
// body in X-Census-Signature, so the receiver can check that the
// events came from this server and were not changed on the way.
export function webhookOutput(env: OutputEnv): Output | null {
  const url = httpUrl(env.WEBHOOK_URL);
  if (!url) return null;
  const secret = env.WEBHOOK_SECRET?.trim();
  return {
    name: 'Webhook',
    host: url.host,
    async send(events: CollectEvent[]) {
      const body = { events };
      const text = JSON.stringify(body);
      const headers: Record<string, string> = secret ? { 'X-Census-Signature': await hmacHex(secret, text) } : {};
      return postJson('Webhook', url.host, url.toString(), body, headers, text);
    },
  };
}
