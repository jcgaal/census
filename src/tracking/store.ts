import { createContext, createElement, useContext, useSyncExternalStore, type ReactNode } from 'react';
import { ensureAnonymousId, forgetAll, readCookie, recordConsent, storedConsent, COOKIE_NAME, type AnonInfo } from './anonymousId';
import { buildIdentify, buildPage, buildTrack, type Props, type SegmentEvent } from './events';
import { normalizeEmail, sha256 } from './hash';
import { sampleAnon, sampleEvents, samplePage, sampleServer } from './sampleData';
import { createCollector, type Collector, type SentBatch } from '../lib/collect';
import { fetchServerContext, type ServerContext } from '../lib/context';
import { site } from '../site.config';

// The page is always in one of three modes. Pending shows the consent
// gate, live records this visitor, and sample shows fixed example
// data without capturing anything from the visitor's browser.
export type Mode = 'pending' | 'live' | 'sample';

// The server context type is re-exported here, so sections and sample
// data can import every piece of page state from the store alone and
// never need to reach into the module that performs the request.
export type { ServerContext };

// Each kind of terminal block the page can print. A block is a command
// and its output in the terminal, appended as the visitor reaches the
// section it belongs to, or when they identify or press Forget me.
export type BlockKind =
  | 'whoami'
  | 'forget'
  | 'identity'
  | 'origin'
  | 'device'
  | 'location'
  | 'tail'
  | 'identify'
  | 'destinations'
  | 'limits'
  | 'summary'
  | 'sent';

// What the identify block shows: the identify call, every earlier event
// with the new userId attached, how many were anonymous before, and the
// normalized email next to the SHA-256 hash the userId comes from.
export interface IdentifyData {
  identify: SegmentEvent;
  merged: SegmentEvent[];
  mergedCount: number;
  normalizedEmail: string;
  hash: string;
}

// What a sent block shows: one batch posted to /api/collect with each
// output's result, or a note saying why the outputs were not used,
// when the server's outputs could not be matched to the consent gate.
export interface SentData {
  batch?: SentBatch;
  note?: 'mismatch' | 'unverified';
}

// One printed terminal block. The key is unique for React, the section
// records which part of the page printed it, data is only present on
// identify blocks, and sent only on blocks that report an output send.
export interface Block {
  key: string;
  kind: BlockKind;
  section: string;
  data?: IdentifyData;
  sent?: SentData;
}

// Everything the page renders from. Events hold the full stream in the
// order it happened, viewed lists sections already seen so each prints
// once, and serverStatus tracks the single /api/context request.
export interface State {
  mode: Mode;
  consentAt: string | null;
  anon: AnonInfo | null;
  pageEvent: SegmentEvent | null;
  events: SegmentEvent[];
  userId: string | null;
  traits: Props | null;
  emailHash: string | null;
  server: ServerContext | null;
  serverStatus: 'idle' | 'loading' | 'done' | 'error';
  viewed: string[];
  blocks: Block[];
}

// Sections print their terminal blocks the first time they are viewed,
// and the profile summary prints with section 09 when closing is on,
// or right after the limits otherwise. Others only log Section Viewed.
export const SECTION_BLOCKS: Record<string, BlockKind[] | undefined> = {
  '01_identity': ['identity'],
  '02_origin': ['origin'],
  '03_device': ['device'],
  '04_location': ['location'],
  '05_behavior': ['tail'],
  '07_destinations': ['destinations'],
  ...(site.closing.enabled ? { '08_limits': ['limits'], '09_closing': ['summary'] } : { '08_limits': ['limits', 'summary'] }),
};

// Blocks get an increasing key so React can keep each one in place as
// new ones are appended, and they default to the consent section,
// which is where the whoami block prints before anything is chosen.
let seq = 0;
const block = (kind: BlockKind, section = '00_consent', data?: IdentifyData): Block => ({ key: `b${++seq}`, kind, section, data });

// The starting state is pending mode with only the whoami block, so no
// ID, event or server data exists until the visitor makes a choice.
// Forget me reuses it, passing in the line that confirms the erasure.
const empty = (blocks: Block[] = [block('whoami')]): State => ({
  mode: 'pending',
  consentAt: null,
  anon: null,
  pageEvent: null,
  events: [],
  userId: null,
  traits: null,
  emailHash: null,
  server: null,
  serverStatus: 'idle',
  viewed: [],
  blocks,
});

// State lives in a small store outside React and starts pending, so no
// cookie, storage, listener or /api/context call exists until the
// visitor presses Start and grantConsent switches it to live mode.
export function createStore() {
  let state: State = empty();
  // The generation goes up on every Forget me. Async work notes it when
  // it starts and drops its result if it changed, so a reply arriving
  // after the erase cannot bring the visitor's data back on screen.
  let generation = 0;
  const subs = new Set<() => void>();
  // The output collector for the current live visit. It exists only when
  // the build named outputs and the visitor pressed Start, and it is
  // stopped and dropped by Forget me, sample mode or a new visit.
  let collector: Collector | null = null;

  // Merges a patch, or the result of a function of the current state,
  // and notifies every subscriber, which is how useSyncExternalStore
  // learns that the page needs to render again after each change.
  const set = (patch: Partial<State> | ((s: State) => Partial<State>)) => {
    state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
    subs.forEach((f) => {
      f();
    });
  };

  // The IDs every new event is stamped with. It is only called in live
  // mode once startLive has set the anonymous ID, which is why the
  // non-null assertion on the anon field is safe at each call site.
  const ids = () => ({ anonymousId: state.anon!.anonymousId, userId: state.userId });

  // Sent blocks print under the section the visitor reached last, so on
  // narrow screens each send shows up inline where they are reading,
  // and under the identity section before any section has been seen.
  const sentBlock = (sent: SentData): Block => ({ ...block('sent', state.viewed[state.viewed.length - 1] ?? '01_identity'), sent });
  const addSent = (sent: SentData) => set((s) => ({ blocks: [...s.blocks, sentBlock(sent)] }));

  // Stops the collector and forgets it. Its queue is dropped and any
  // answer still on the way is ignored, so no further send can happen
  // and nothing more about earlier sends is printed in the terminal.
  const stopCollector = () => {
    collector?.stop();
    collector = null;
  };

  // Outputs match when the server names exactly the outputs the consent
  // gate named, by name and host, with the same IP setting. Otherwise
  // the visitor was told something else, so the page sends nothing.
  const sameOutputs = (a: { name: string; host: string }[], forwardIp: boolean) => {
    const key = (o: { name: string; host: string }) => `${o.name}|${o.host}`;
    const want = site.outputs.map(key).sort().join(',');
    return a.map(key).sort().join(',') === want && forwardIp === site.forwardIp;
  };

  // The server is asked for the visitor's IP and location once a visit.
  // A response arriving after Forget me belongs to an erased visit,
  // so the generation check drops it instead of displaying it.
  async function fetchContext() {
    const gen = generation;
    set({ serverStatus: 'loading' });
    try {
      const data = await fetchServerContext();
      if (gen !== generation) return;
      set({ server: data, serverStatus: 'done' });
      // The server's answer also lists its outputs. Sending starts only
      // when they match the consent gate, and the queued events since
      // Start then leave together in the first batch to the outputs.
      if (collector && sameOutputs(data.outputs ?? [], data.forwardIp ?? false)) collector.enable();
      else if (collector) {
        stopCollector();
        addSent({ note: 'mismatch' });
      }
    } catch {
      if (gen !== generation) return;
      set({ serverStatus: 'error' });
      if (collector) {
        stopCollector();
        addSent({ note: 'unverified' });
      }
    }
  }

  // Going live sets the anonymous ID, records the page event every CDP
  // sends first, and starts the location request in the background,
  // so the page renders without waiting on the server to answer.
  function startLive(consentAt: string) {
    const anon = ensureAnonymousId();
    state = { ...state, anon };
    const pageEvent = buildPage({ anonymousId: anon.anonymousId, userId: null });
    set({ mode: 'live', consentAt, anon, pageEvent, events: [pageEvent], blocks: [block('whoami')], viewed: [] });
    // With outputs named on the consent gate, a collector starts holding
    // events now, and it sends nothing until the server has confirmed
    // the same outputs in its reply to the /api/context request.
    stopCollector();
    if (site.outputs.length) {
      collector = createCollector((batch) => addSent({ batch }));
      collector.add(pageEvent);
    }
    void fetchContext();
  }

  return {
    getState: () => state,
    // Adds a listener for state changes and returns the function that
    // removes it, which is the contract useSyncExternalStore expects
    // from any external store it reads from during a React render.
    subscribe(f: () => void) {
      subs.add(f);
      return () => subs.delete(f);
    },

    // On load, ?sample=1 opens sample mode directly. Otherwise a visitor
    // who consented earlier resumes live, but only while their cookie
    // still exists, so reloading does not put the consent gate back up.
    init() {
      if (state.mode !== 'pending') return;
      if (new URLSearchParams(location.search).get('sample') === '1') return this.startSample();
      const at = storedConsent();
      if (at) startLive(at);
    },

    // Start on the consent gate. Consent is recorded with its timestamp
    // first, and only then are the cookie, storage, page event and the
    // /api/context request created by switching the store to live mode.
    grantConsent() {
      const at = new Date().toISOString();
      recordConsent(at);
      startLive(at);
    },

    // Show sample data on the consent gate. Every value comes from the
    // fixed sample set, no cookie or storage is written, and the server
    // is never called, since the sample answer is already marked done.
    startSample() {
      stopCollector();
      set({
        mode: 'sample',
        consentAt: new Date().toISOString(),
        anon: sampleAnon,
        pageEvent: samplePage,
        events: [...sampleEvents],
        server: sampleServer,
        serverStatus: 'done',
        blocks: [block('whoami')],
        viewed: [],
      });
    },

    // Forget me erases the cookie and storage and returns to the consent
    // gate. The terminal keeps one line saying so, so the visitor has
    // a record that the profile was erased and not just hidden.
    forget() {
      generation++;
      stopCollector();
      forgetAll();
      set(empty([block('forget'), block('whoami')]));
    },

    // Track events are recorded in live mode only. Sample mode has a set
    // of fixed events of its own, and nothing at all is recorded until
    // the visitor has chosen between live mode and sample mode.
    track(event: string, properties: Props = {}) {
      if (state.mode !== 'live' || !state.anon) return;
      const e = buildTrack(event, properties, ids());
      set((s) => ({ events: [...s.events, e] }));
      collector?.add(e);
    },

    // Marks a section as seen and appends its blocks the first time only,
    // then logs Section Viewed, which track ignores in sample mode since
    // the sample tail already carries its own fixed section events.
    sectionViewed(section: string) {
      if (state.mode === 'pending' || state.viewed.includes(section)) return;
      const kinds = SECTION_BLOCKS[section] ?? [];
      set((s) => ({ viewed: [...s.viewed, section], blocks: kinds.length ? [...s.blocks, ...kinds.map((kind) => block(kind, section))] : s.blocks }));
      this.track('Section Viewed', { section });
    },

    // Identify is the main job of a CDP. The userId is derived from the
    // email hash, and every earlier anonymous event is shown again
    // with it attached, so the whole visit becomes one profile.
    async identify(email: string, name: string, company: string) {
      if (state.mode === 'pending' || !state.anon) return;
      const gen = generation;
      const normalizedEmail = normalizeEmail(email);
      const hash = await sha256(normalizedEmail);
      // Hashing is async, so a Forget me pressed while it runs bumps the
      // generation and this identify is dropped instead of attaching a
      // userId and traits to a visit that has already been erased.
      if (gen !== generation) return;
      const userId = `user_${hash.slice(0, 12)}`;
      const traits: Props = { email: normalizedEmail, name: name.trim() || null, company: company.trim() || null };
      const prior = state.events.filter((e) => e.type !== 'identify');
      const anonymousCount = prior.filter((e) => !e.userId).length;
      const identify = buildIdentify(traits, { anonymousId: state.anon.anonymousId, userId });
      const merged = prior.map((e) => ({ ...e, userId }));
      set((s) => ({
        userId,
        traits,
        emailHash: hash,
        events: [...s.events, identify],
        blocks: [...s.blocks, block('identify', '06_identity_resolution', { identify, merged, mergedCount: anonymousCount, normalizedEmail, hash })],
      }));
      collector?.add(identify);
    },
  };
}

// The store's public interface, inferred from createStore so that the
// listeners, hooks and sections all share one type that cannot drift
// from the methods that the store actually provides at runtime.
export type Store = ReturnType<typeof createStore>;

// One store for the whole page, created at module load in pending
// mode. Creating it records nothing, so importing this module is safe
// before the visitor has seen the consent gate or made a choice.
export const store = createStore();

// The context defaults to the shared store, so components work even
// outside a provider, while the provider below still makes the store
// explicit at the root of the tree where the page is rendered.
const StoreContext = createContext<Store>(store);

// Provides the store to the component tree. It uses createElement
// rather than JSX, so this module stays a plain .ts file alongside
// the rest of the tracking code that has no markup of its own.
export function StoreProvider({ children }: { children: ReactNode }) {
  return createElement(StoreContext.Provider, { value: store }, children);
}

// Returns the store itself for components that call its methods, such
// as the consent buttons and the identify form, without subscribing
// them to state changes that they do not need to render anything from.
export function useStoreApi(): Store {
  return useContext(StoreContext);
}

// Subscribes a component to the whole state through React's external
// store hook, so it renders again on every change and always reads a
// consistent snapshot even while concurrent rendering is in progress.
export function useAppState(): State {
  const s = useStoreApi();
  return useSyncExternalStore(s.subscribe, s.getState);
}

// The assembled profile, used by profile --summary and the copy button.
// It is what a CDP would hold after this visit, with the IP masked
// before it is shown on the page or copied to the clipboard.
export function buildProfile(s: State, device: unknown) {
  const page = s.pageEvent;
  const ctx = (page?.context ?? {}) as { campaign?: unknown; clickIds?: unknown };
  const last = s.events[s.events.length - 1];
  return {
    identity: {
      anonymousId: s.anon?.anonymousId ?? null,
      userId: s.userId,
      traits: s.traits,
      returningVisitor: s.anon?.returningVisitor ?? false,
    },
    origin: {
      landingPage: page?.properties?.url ?? null,
      referrer: page?.properties?.referrer || null,
      campaign: ctx.campaign ?? null,
      clickIds: ctx.clickIds ?? null,
    },
    device,
    location: s.server
      ? { ip: maskIp(s.server.ip), country: s.server.geo?.country ?? null, region: s.server.geo?.region ?? null, city: s.server.geo?.city ?? null, source: s.server.geo?.source ?? null }
      : null,
    eventCount: s.events.length,
    firstSeen: s.anon?.firstSeen ?? null,
    lastSeen: last?.timestamp ?? null,
    identified: Boolean(s.userId),
  };
}

// IP addresses keep only their network part: the first two IPv4 octets
// or the first two IPv6 groups. That is enough to make the point
// about location without printing the whole address on screen.
export function maskIp(ip: string | null): string | null {
  if (!ip) return ip;
  if (ip.includes('.')) {
    const p = ip.split('.');
    return p.length === 4 ? `${p[0]}.${p[1]}.xxx.xxx` : ip;
  }
  const g = ip.split(':');
  return `${g.slice(0, 2).join(':')}:xxxx:xxxx::`;
}

// Sample mode shows a made-up cookie, since no cookie was ever set.
// Live mode shows the real cookie string, the same one any server on
// this domain receives with every request that the browser sends.
export function currentCookieString(s: State): string {
  if (s.mode === 'sample') return `${COOKIE_NAME}=${s.anon?.anonymousId}`;
  return document.cookie || (readCookie(COOKIE_NAME) ?? '');
}
