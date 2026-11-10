import { collectResponse } from '../../server/collect.js';
import type { OutputEnv } from '../../server/outputs/index.js';

// Cloudflare Pages hands each function the request and the project's
// environment variables, so the output keys are read from env here
// rather than from process.env, which the Workers runtime lacks.
interface PagesContext {
  request: Request;
  env: OutputEnv;
}

// Cloudflare Pages function for POST /api/collect. CF-Connecting-IP
// stands in for the socket address, which is used only for the rate
// limit and, with OUTPUT_FORWARD_IP=true, for the forwarded events.
export function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  return collectResponse(request, env, request.headers.get('cf-connecting-ip'));
}
