// Joins names into a list for a sentence, such as "Segment and Webhook"
// in English or "Segment y Webhook" in Spanish, so the copy naming the
// enabled outputs reads naturally with one output or with several.
export const listOf = (xs: string[], and: string) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${and} ${xs[xs.length - 1]}`);
export type OutputInfo = { name: string; host: string };
