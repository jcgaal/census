import { contextResponse } from '../server/context.js';

// Vercel function for GET /api/context. Vercel sets X-Forwarded-For
// and the x-vercel-ip-* geo headers, so no lookup is needed there and
// GEO_PROVIDER_URL is passed on only as a fallback for missing ones.
export function GET(request: Request): Promise<Response> {
  return contextResponse(request, { GEO_PROVIDER_URL: process.env.GEO_PROVIDER_URL });
}
