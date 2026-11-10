import { contextResponse, type ContextEnv } from '../../server/context.js';

// Cloudflare Pages hands each function the request and the project's
// environment variables, so GEO_PROVIDER_URL is read from env here
// rather than from process.env, which the Workers runtime lacks.
interface PagesContext {
  request: Request;
  env: ContextEnv;
}

// Cloudflare Pages function for GET /api/context. Cloudflare sets
// CF-Connecting-IP and CF-IPCountry, so the connecting address stands
// in for the socket, and region and city need a managed transform.
export function onRequestGet({ request, env }: PagesContext): Promise<Response> {
  return contextResponse(request, env, request.headers.get('cf-connecting-ip'));
}
