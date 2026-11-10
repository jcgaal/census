// What GET /api/context returns: the request IP, approximate location
// and Accept-Language, which the server reads from the visitor's own
// request, plus the time it arrived, mirroring the server's own type.
export interface ServerContext {
  ip: string | null;
  geo: { country: string | null; region: string | null; city: string | null; source: string } | null;
  acceptLanguage: string | null;
  receivedAt: string;
  outputs?: { name: string; host: string }[];
  forwardIp?: boolean;
}

// The only request the page ever makes, and only after consent. It
// throws on a network error or a non-2xx response, so the caller can
// tell the visitor that the server context could not be loaded.
export async function fetchServerContext(): Promise<ServerContext> {
  const res = await fetch('/api/context', { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as ServerContext;
}
