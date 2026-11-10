// English copy for every section and the terminal, and the reference
// shape for every other language, so a missing or extra key in another
// copy object fails the typecheck rather than showing up at runtime.
import { pageTitle, site } from '../site.config';
import type { Row } from './lang';

export const en = {
  meta: { title: pageTitle('en') },
  header: {
    sub: 'live first-party tracking',
    how: 'How it works',
    contact: 'Contact',
    fork: 'Fork the repo',
    forget: 'Forget me',
    switchTo: 'ES',
    switchLabel: 'Ver en español',
  },
  consent: {
    label: '00 // Consent',
    title: 'What a website learns about you on your first visit',
    body: (
      <>
        <p>
          This page records the data a customer data platform such as Segment would collect about you and shows it to you as it happens, in Segment's own
          event format.
        </p>
        <p>
          <strong>Everything stays in your browser.</strong>{' '}
          <span className="dim">Nothing is stored on our side or sent to anyone else, and you can erase it whenever you want.</span>
        </p>
      </>
    ),
    start: 'Start',
    sample: 'Show sample data instead',
  },
  fieldCols: ['Field', 'Source'] as [string, string],
  s01: {
    label: '01 // Identity',
    body: (
      <>
        <p>When you clicked Start, this page generated a random ID for you and saved it in a cookie on this domain.</p>
        <p>
          The cookie lasts a year. <span className="dim">Any page on this site that you load during that year can read it and tie the new visit to the earlier ones.</span>
        </p>
        <p>
          A CDP calls this the <strong>anonymousId</strong>. Every later event, form and purchase gets attached to it.
        </p>
      </>
    ),
    rows: [
      [<code>anonymousId</code>, <><code>crypto.randomUUID()</code>, generated once</>],
      [<code>{site.cookieName}</code>, 'First-party cookie on this domain, 365 days, SameSite=Lax'],
      [<code>firstSeen</code>, 'Time of your first consented visit, kept in localStorage'],
    ] as Row[],
  },
  s02: {
    label: '02 // Origin',
    body: (
      <>
        <p>This site can read the URL you landed on and the page that sent you here.</p>
        <p>
          Marketers add UTM parameters to their links to record <strong>which campaign a click came from</strong>.{' '}
          <span className="dim">Ad platforms append their own click IDs, gclid for Google and fbclid for Meta, so the sale can be credited back to the ad.</span>
        </p>
      </>
    ),
    rows: [
      ['Referrer', <><code>document.referrer</code>, the page that linked here</>],
      ['UTM parameters', <><code>utm_source</code>, <code>utm_medium</code>, <code>utm_campaign</code>, <code>utm_term</code>, <code>utm_content</code> in the URL</>],
      ['Ad click IDs', <><code>gclid</code> Google, <code>fbclid</code> Meta, <code>msclkid</code> Microsoft, <code>ttclid</code> TikTok, <code>li_fat_id</code> LinkedIn</>],
    ] as Row[],
    reload: 'Reload with a LinkedIn ad link',
  },
  s03: {
    label: '03 // Device',
    body: (
      <>
        <p>Your browser sends a description of itself with every request and exposes more through standard JavaScript APIs.</p>
        <p>
          Analytics tools read the browser and operating system, screen and window size, language and time zone, plus a few accessibility and privacy settings.{' '}
          <strong>A CDP keeps all of it on your profile.</strong>
        </p>
      </>
    ),
    rows: [
      ['Browser, OS, mobile', <><code>navigator.userAgentData</code> or the user agent string</>],
      ['Language, time zone', <><code>navigator.languages</code>, <code>Intl.DateTimeFormat</code></>],
      ['Screen, viewport, pixel ratio', <><code>screen</code>, <code>innerWidth</code>, <code>devicePixelRatio</code></>],
      ['Color scheme, reduced motion', 'CSS media queries'],
      ['Connection', <><code>navigator.connection</code>, where the browser exposes it</>],
      ['Cookies, Do Not Track, GPC', <><code>navigator.cookieEnabled</code>, <code>doNotTrack</code>, <code>globalPrivacyControl</code></>],
    ] as Row[],
  },
  s04: {
    label: '04 // Location',
    body: (
      <>
        <p>Every request to a server carries your IP address, since the server needs it to send the page back.</p>
        <p>
          Looking that IP up in a geolocation database gives an approximate <strong>city</strong>.{' '}
          <span className="dim">It is usually right to the metro area, which is enough for ad targeting and regional reports.</span>
        </p>
      </>
    ),
    rows: [
      ['IP address', 'The network request itself. This server does not log or store it.'],
      ['Country, region, city', 'IP geolocation from host headers or a lookup service'],
      ['Accept-Language', 'Request header your browser sends with every page'],
    ] as Row[],
  },
  s05: {
    label: '05 // Behavior',
    body: (
      <>
        <p>From here on, this page records an event each time you reach a new section, click a button or link, switch tabs, or spend another 30 seconds reading.</p>
        <p>
          Each event carries a timestamp and your anonymousId, so a CDP can put them in order as <strong>a timeline of your visit</strong>.
        </p>
      </>
    ),
    cols: ['Event', 'Recorded when'] as [string, string],
    rows: [
      [<code>Section Viewed</code>, 'A section reaches 40% of the screen for the first time'],
      [<code>Scroll Depth Reached</code>, 'You pass 25, 50, 75 and 100% of the page, once each'],
      [<code>Element Clicked</code>, 'You click a button or link. Only its visible text and element type are kept.'],
      [<code>Time On Page</code>, 'Every 30 seconds while this tab is visible'],
      [<code>Tab Hidden / Tab Visible</code>, 'You switch tabs or windows'],
      [<code>Form Started</code>, 'You first focus the form in section 06. Field values are never recorded.'],
    ] as Row[],
  },
  s06: {
    label: '06 // Identity resolution',
    body: (
      <>
        <p>So far, every event on this page belongs to an anonymous ID.</p>
        <p>
          Enter an email below. The CDP will link that ID to the email and move <strong>everything you have done here</strong> onto a named profile.
        </p>
      </>
    ),
    after: (
      <>
        <p>
          Every event recorded before the form now sits on the same profile as your email. <span className="dim">That join is the main job of a CDP.</span>
        </p>
        <p>
          If you come back next week from a different link, the cookie will still be there and <strong>that visit will land on this profile too.</strong>
        </p>
      </>
    ),
    email: 'Email · required',
    name: 'Name',
    company: 'Company',
    optional: 'Optional',
    emailPlaceholder: 'you@company.com',
    submit: 'Identify me',
    note: 'Your email is not sent anywhere. Use a fake one if you prefer.',
  },
  s07: {
    label: '07 // Destinations',
    body: (
      <>
        <p>Collected events are forwarded to the other tools a company runs.</p>
        <p>
          Each tool expects its own format, so the CDP rewrites the same event for <strong>Google Analytics, Meta's ad platform, the CRM and the data warehouse.</strong>
        </p>
      </>
    ),
    cols: ['Destination', 'Format shown'] as [string, string],
    rows: [
      ['Google Analytics 4', 'Measurement Protocol body: client_id, events, user_properties'],
      ['Meta Conversions API', 'event_name, event_time, action_source, user_data with the hashed email'],
      ['HubSpot', 'Contact properties and a timeline event'],
      ['Data warehouse', 'One row in a tracks or pages table'],
    ] as Row[],
    note: 'Preview only. Nothing on this page is sent to these companies.',
  },
  s08: {
    label: '08 // Limits',
    body: (
      <>
        <p>
          A website can reach <strong>much less than most people assume</strong>.{' '}
          <span className="dim">The browser walls each site off from everything else, and features like location or contacts need your explicit permission.</span>
        </p>
      </>
    ),
    cols: ['Cannot see', 'Why'] as [string, string],
    rows: [
      ['Cookies from other websites', 'Browsers isolate them by design'],
      ['Your browsing history', 'Not exposed to websites'],
      ['Files, photos, contacts, messages', 'Not accessible from a web page'],
      ['Your name or email before you type it', 'Only after a form or login'],
      ['Your precise location', 'Only with your explicit permission'],
    ] as Row[],
  },
  closing: {
    contact: site.owner ? `Email ${site.owner}` : 'Get in touch',
    fork: `Fork ${site.name} on GitHub`,
  },
  footer: {
    demos: 'Demos',
    thisPage: `${site.name} (this page)`,
    source: 'Source on GitHub',
    contact: 'Contact',
    privacy: 'Privacy',
    privacyNote: 'Nothing on this page is stored or shared.',
  },
  term: {
    pending: 'pending',
    granted: 'granted',
    sampleConsent: 'sample data (nothing captured)',
    forgot: 'cookie deleted · 0 events · profile erased',
    srcCookie: '// source: first-party cookie set by this page',
    srcCookieSample: '// source: sample data (no cookie was set)',
    srcPage: '// source: page URL and document.referrer',
    srcDevice: '// source: browser navigator, screen and Intl APIs',
    srcLocation: '// source: network request, IP geolocation lookup',
    srcDest: '// source: the events above, reshaped in your browser. 0 network requests.',
    live: 'live',
    fetching: 'fetching…',
    fetchError: 'error: could not reach /api/context',
    showIp: 'show full IP',
    maskIp: 'mask IP',
    geoUnavailable: 'unavailable on this host',
    notExposed: 'not exposed by this browser',
    notSet: 'not set',
    merged: (n: number, id: string) => `merged ${n} anonymous events into ${id}`,
    hashNote: '// ad platforms compare this hash with the hashed emails of their own users',
    banner: 'Preview only. Nothing on this page is sent to these companies.',
    cookieNote: "// browsers only hand a page the cookies of its own site",
    cookieEmpty: '(empty)',
    summary: (took: string) => `// a CDP assembled this profile from ${took} on this page`,
    streaming: (n: number) => `// ${n} events so far · new ones appear as they happen`,
    events: 'events',
    profile: 'profile',
    anonymous: 'anonymous',
    identified: 'identified',
    consent: 'consent',
    consentSample: 'sample',
    copy: 'copy profile JSON',
    copied: 'copied ✓',
    forget: 'forget me',
    dest: {
      gaNote: 'GA4 does not accept email or other personal data, so only user_id and company are sent.',
      metaHashed: 'em is the SHA-256 of your normalized email.',
      metaNoEmail: 'No em yet. Meta can only match you once it has an email.',
      hubspotNoContact: '// no contact yet: HubSpot creates one only when it has an email',
      hubspotEndpoint: 'contact properties + timeline event',
      warehousePages: 'one row in table: pages',
      warehouseTracks: 'one row in table: tracks',
    },
  },
};
