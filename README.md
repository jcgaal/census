![1950 U.S. census population schedule](census-schedule.webp)

*The 1950 census population schedule recorded name, age, marital status, and birthplace of everyone, and asked more detailed questions of six people per page.*

1950 Census population schedule, U.S. Census Bureau. Public domain. [Source](https://www.census.gov/library/photos/1950a.html)

# Census

What a website learns about you on your first visit, shown to you as it happens.

Census is a single page. It asks for consent, then records what a customer data platform such as Segment would collect about the visitor, and prints each event in a terminal panel next to the explanation. It runs on your own domain, loads no third-party scripts, and sends nothing anywhere.

---

## Why you would want this

- **Explaining CDPs.** Clients and stakeholders see their own data become a profile instead of reading a diagram about it.
- **Onboarding marketers to event specs.** Every event is a real `page`, `track` or `identify` call in Segment's format, with the fields filled in.
- **A reference for destination mappings.** The same event is reshaped for GA4, the Meta Conversions API, HubSpot and a warehouse row, side by side.
- **Privacy education.** It shows what a first-party script can read, and what it cannot.

---

## Quickstart

You need Node 22 or later.

```bash
git clone https://github.com/jcgaal/census && cd census
npm install
npm run dev
```

Open `http://localhost:5173` and click **Start**, or open `http://localhost:5173/?sample=1` to see the page with sample data and collect nothing. Add `?lang=es` for Spanish.

Vite serves the page and proxies `/api` to the Node server on port `3001`. Location stays empty on `localhost`, because private IPs are never looked up.

---

## What it collects

Nothing runs before the consent gate. After **Start**, each section explains one kind of data and the terminal prints what was actually read.

| Section | What it shows |
|---|---|
| 00 Consent | A choice between real data and sample data. Nothing is collected before it. |
| 01 Identity | A random anonymous ID in a first-party cookie, and how later events attach to it |
| 02 Origin | URL, UTM parameters and referrer, and how they become attribution |
| 03 Device | Browser, OS, screen, language, time zone and a few accessibility and privacy settings |
| 04 Location | The IP address and approximate location from the request to `/api/context` |
| 05 Behavior | A live stream of section views, clicks, scroll depth and time on page |
| 06 Identity resolution | An email form that merges the anonymous history into a named profile. The email stays in the browser. |
| 07 Destinations | The latest event reshaped for GA4, Meta, HubSpot and a warehouse. Preview only. |
| 08 Limits | What a web page cannot see |
| 09 Closing | Optional, your own text. Hidden unless you enable it. |

What it cannot see, as section 08 lists it:

| Cannot see | Why |
|---|---|
| Cookies from other websites | Browsers isolate them by design |
| Your browsing history | Not exposed to websites |
| Files, photos, contacts, messages | Not accessible from a web page |
| Your name or email before you type it | Only after a form or login |
| Your precise location | Only with your explicit permission |

---

## Configuration

Everything is optional. Copy `.env.example` to `.env` and set what you need. `VITE_` variables are compiled into the page, so change them before `npm run build`. With nothing set, the page names no company and section 09 is hidden.

| Variable | Default | Purpose |
|---|---|---|
| `VITE_SITE_NAME` | `Census` | Name in the header, page title and footer |
| `VITE_OWNER_NAME` | empty | Name in the footer copyright and the section 09 contact button. Empty hides the copyright line. |
| `VITE_LOGO_URL` | empty | Logo next to the name. Serve it from your own domain. |
| `VITE_OG_IMAGE_URL` | empty | Social preview image |
| `VITE_COOKIE_PREFIX` | `census` | Cookie `<prefix>_anon_id`, storage keys `<prefix>_profile` and `<prefix>_consent` |
| `VITE_DEFAULT_LANG` | `en` | Language for browsers set to neither English nor Spanish |
| `VITE_CLOSING_ENABLED` | `false` | Shows section 09 |
| `VITE_CLOSING_TITLE_EN`, `_ES` | empty | Section 09 title. Spanish falls back to English. |
| `VITE_CLOSING_BODY_EN`, `_ES` | empty | Section 09 text. One paragraph per line (a literal `\n` also counts), `**bold**` allowed. |
| `VITE_CONTACT_EMAIL` | empty | Contact links in the header, footer and section 09 |
| `VITE_LINKEDIN_URL` | empty | LinkedIn link in the footer |
| `VITE_EXTRA_LINK_LABEL`, `_LABEL_ES`, `_URL` | empty | One extra link, for example to another demo, in the header, footer and section 09 |
| `VITE_REPO_URL` | this repository | Where the fork buttons point. Set it to your fork. |
| `GEO_PROVIDER_URL` | empty | Server only. IP geolocation lookup, with `{ip}` as a placeholder. |
| `PORT` | `3001` | Server only. Port for `npm start`. |

### Location

The server looks for location in this order:

1. Host headers. Vercel's `x-vercel-ip-*` headers and Cloudflare's `cf-ipcountry` work with no setup. Cloudflare needs the "Add visitor location headers" managed transform for region and city.
2. `GEO_PROVIDER_URL`, when set. Responses shaped like ipapi.co, ipinfo.io or ip-api.com are understood. The lookup gives up after 2.5 seconds.

```bash
GEO_PROVIDER_URL=https://ipapi.co/{ip}/json/
```

With neither, section 04 shows the IP only. With a provider set, every visitor IP is sent to it. Tell your visitors if you turn it on.

---

## Adding a destination

Each destination is one file in `src/destinations/` that turns the latest event into a preview, plus one line in the registry. For example, a generic webhook:

```ts
// src/destinations/webhook.ts
import type { Formatter } from './types';

export const webhook: Formatter = (input) => ({
  name: 'Webhook',
  endpoint: 'POST https://example.com/hooks/census',
  body: input.event && {
    type: input.event.type,
    event: input.event.event ?? null,
    anonymousId: input.event.anonymousId,
    userId: input.identify?.userId ?? null,
    properties: input.event.properties ?? {},
    timestamp: input.event.timestamp,
  },
});
```

```ts
// src/destinations/index.ts
export const destinations: Formatter[] = [ga4, metaCapi, hubspot, warehouse, webhook];
```

Formatters build payloads for display only. Do not add a request: the page promises that destinations send nothing.

---

## Deployment

| Host | How | Location |
|---|---|---|
| Vercel | Import the repository. Vercel builds the Vite app and serves `api/context.ts` as a function. | Free, from headers |
| Cloudflare Pages | Build command `npm run build`, output directory `dist`. `functions/api/context.ts` becomes the endpoint. | Country free; region and city need the visitor location managed transform |
| Any Node host (Render, Fly.io, Railway, a VPS) | `npm run build && npm start` runs `server/node.ts`, which serves `dist/` and `/api/context`. Set `PORT` if the host assigns one. | Needs `GEO_PROVIDER_URL` |
| Docker | `docker build -t census . && docker run -p 8080:8080 census`. Listens on `8080`, with `/health` for health checks. | Needs `GEO_PROVIDER_URL` |
| Static only (GitHub Pages, Netlify without functions) | Upload `dist/`. | None. Sample mode works; in live mode section 04 reports that `/api/context` could not be reached. |

On a Node host or in Docker, put the server behind a proxy that sets `X-Forwarded-For`. The server reads the first address in that header as the visitor's IP.

---

## Privacy

- **Consent gate.** Nothing is read, stored or requested before the visitor clicks **Start**. Sample mode collects nothing and requests no location.
- **First-party cookie.** One cookie, `census_anon_id` (365 days, `SameSite=Lax`), and two local storage keys, `census_profile` and `census_consent`. The prefix follows `VITE_COOKIE_PREFIX`.
- **Nothing stored server side.** The only request the page makes is `GET /api/context`, after consent. The response is marked `no-store`, no request logger is mounted, and the IP exists only for the length of that request.
- **Host logs.** Your hosting platform (Vercel, Cloudflare or your own server) may keep its own access logs that include IP addresses. This app has no control over those.
- **Forget me.** The button in the header deletes the cookie and both storage keys. Language lives in the URL, not in storage.
- **No third-party scripts.** No analytics, pixels, tag managers or font CDNs. Fonts are bundled with the page.

---

## Not affiliated

Census is not affiliated with Segment, Google, Meta or HubSpot. Their names appear only to describe the formats the page mirrors.

---

## License

MIT. See [LICENSE](LICENSE). Security reports: see [SECURITY.md](SECURITY.md).

The header image is a U.S. federal government record in the public domain, credited above.
