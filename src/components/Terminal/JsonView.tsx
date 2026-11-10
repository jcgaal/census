import { Fragment } from 'react';

// Matches the tokens of pretty printed JSON: strings with an optional
// trailing colon for keys, booleans, null and numbers, so each one
// can be wrapped in a span that carries its own syntax color.
const TOKEN = /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

// Classify maps a matched token to its CSS class, telling keys from
// string values by the colon that follows them in the JSON text, and
// treating anything that is not quoted or a literal as a number.
function classify(tok: string): string {
  if (tok.startsWith('"')) return /:\s*$/.test(tok) ? 'j-key' : 'j-str';
  if (tok === 'true' || tok === 'false') return 'j-bool';
  if (tok === 'null') return 'j-null';
  return 'j-num';
}

// JsonView pretty prints a value as JSON and colors its tokens. The
// text between matches is kept as it is, so the indentation and the
// punctuation are exactly what JSON.stringify returns for the value.
export function JsonView({ value, className }: { value: unknown; className?: string }) {
  const text = JSON.stringify(value, null, 2) ?? 'undefined';
  const parts: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(TOKEN)) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push(<Fragment key={i++}>{text.slice(last, idx)}</Fragment>);
    const tok = m[0];
    const cls = classify(tok);
    // Keys are split at the colon so only the quoted name is colored
    // and the colon itself keeps the plain text color of the output
    // around it, the way most code editors show JSON object keys.
    if (cls === 'j-key') {
      const colon = tok.lastIndexOf(':');
      parts.push(
        <span key={i++} className="j-key">
          {tok.slice(0, colon)}
        </span>,
        <Fragment key={i++}>{tok.slice(colon)}</Fragment>,
      );
    } else {
      parts.push(
        <span key={i++} className={cls}>
          {tok}
        </span>,
      );
    }
    last = idx + tok.length;
  }
  if (last < text.length) parts.push(<Fragment key={i++}>{text.slice(last)}</Fragment>);
  return <pre className={className}>{parts}</pre>;
}

// KeyValues prints key: value lines with the keys padded to the same
// width, so the values line up in a column the way a command line
// tool would print a summary of fields in a plain text terminal.
export function KeyValues({ rows }: { rows: [string, React.ReactNode][] }) {
  const width = Math.max(...rows.map(([k]) => k.length)) + 1;
  return (
    <pre>
      {rows.map(([k, v]) => (
        <Fragment key={k}>
          <span className="key">{`${k}:`.padEnd(width + 1)}</span>
          <span className="val">{v}</span>
          {'\n'}
        </Fragment>
      ))}
    </pre>
  );
}

// Source prints the muted note under a block that says where its
// data came from, so every value in the terminal can be traced to
// the browser API, the cookie or the server request behind it.
export function Source({ children }: { children: React.ReactNode }) {
  return <pre className="src">{children}</pre>;
}
