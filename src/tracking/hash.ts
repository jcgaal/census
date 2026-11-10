// The Conversions API matches people on normalized, SHA-256-hashed
// identifiers, so emails are hashed in the browser with Web Crypto and
// the raw address never has to appear in a payload built for Meta.
export async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Trimming and lowercasing first gives the same person the same hash
// however they typed their address, which is what makes the hash
// useful as a join key between the different tools that receive it.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
