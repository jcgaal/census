import { contextResponse, type ContextEnv } from '../server/context.js';

// Vercel function for GET /api/context. Vercel sets X-Forwarded-For
// and the x-vercel-ip-* geo headers, so GEO_PROVIDER_URL is only a
// fallback, and the output settings name what the page may forward.
export function GET(request: Request): Promise<Response> {
  return contextResponse(request, process.env as ContextEnv);
}
