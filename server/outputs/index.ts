import { rudderstackOutput } from './rudderstack.js';
import { segmentOutput } from './segment.js';
import type { Output, OutputEnv } from './types.js';
import { webhookOutput } from './webhook.js';

export type { CollectEvent, Output, OutputEnv, OutputResult } from './types.js';

// The registry. Each entry builds its output from env or returns null
// when it is not configured, so adding an output means one new file
// next to this one and one more builder added to the list below.
const builders = [segmentOutput, rudderstackOutput, webhookOutput];

// Every output that the settings turn on, in registry order. With no
// output settings this is empty, and /api/collect then refuses every
// request, so a default deployment never forwards a single event.
export function buildOutputs(env: OutputEnv): Output[] {
  return builders.map((b) => b(env)).filter((o): o is Output => o !== null);
}

// What the page may know about the outputs: name and host only, never
// a key, a full URL or a secret. The build bakes this into the consent
// gate, and /api/context returns it so the two can be compared.
export interface OutputInfo {
  name: string;
  host: string;
}

// The names the registry gives its outputs, and the shape of a host as
// URL.host prints it: lowercase name or address with an optional port.
// A build-time list is checked against both before it is baked in.
const NAMES = ['Segment', 'RudderStack', 'Webhook'];
const HOST = /^[a-z0-9.-]+(:\d{1,5})?$/;

// The public description of the enabled outputs, plus whether the
// visitor's IP is forwarded, so the consent gate can say plainly
// where the events go and whether the address goes with them.
export function describeOutputs(env: OutputEnv): { outputs: OutputInfo[]; forwardIp: boolean } {
  return {
    outputs: buildOutputs(env).map(({ name, host }) => ({ name, host })),
    forwardIp: env.OUTPUT_FORWARD_IP === 'true',
  };
}

// What the build bakes into the consent gate. CENSUS_OUTPUTS, a list
// such as Segment=api.segment.io,Webhook=hooks.example.com, lets a
// build name the outputs with no key or secret in its environment.
export function publicOutputs(env: OutputEnv & { CENSUS_OUTPUTS?: string }): { outputs: OutputInfo[]; forwardIp: boolean } {
  const listed = env.CENSUS_OUTPUTS?.trim();
  if (!listed) return describeOutputs(env);
  // A bad entry stops the build. The message gives only its position,
  // so a key or a full URL pasted here by mistake is never printed in
  // a build log, which hosted platforms often keep and show to others.
  const outputs = listed
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item, i) => {
      const [name, host, ...rest] = item.split('=');
      if (rest.length || !NAMES.includes(name) || !HOST.test(host?.toLowerCase() ?? '')) {
        throw new Error(`CENSUS_OUTPUTS entry ${i + 1} is not Name=host, with Name one of ${NAMES.join(', ')}`);
      }
      return { name, host: host.toLowerCase() };
    });
  return { outputs, forwardIp: env.OUTPUT_FORWARD_IP === 'true' };
}
