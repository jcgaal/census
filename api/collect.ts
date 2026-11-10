import { collectResponse } from '../server/collect.js';
import type { OutputEnv } from '../server/outputs/index.js';

// Vercel function for POST /api/collect. The output keys are read from
// the project's environment variables here, on the server, so they are
// never part of the page bundle or of any response the page receives.
export function POST(request: Request): Promise<Response> {
  return collectResponse(request, process.env as OutputEnv);
}
