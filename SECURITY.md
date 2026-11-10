# Security policy

Census runs in a visitor's browser and reads their IP address on the server. Please report security problems privately, not in public issues.

## Reporting a vulnerability

Use GitHub's private reporting: open the repository's **Security** tab and choose **Report a vulnerability**. Include the affected commit, the steps to reproduce, and the impact you expect.

You should receive an acknowledgement within five working days. Fixes are released as soon as they are ready, and reporters are credited unless they ask not to be.

## Supported versions

Only the latest commit on `main` receives security fixes.

## Scope

In scope:

- Data leaving the browser that the page says stays there, including anything sent to a third party
- The server logging, storing or returning a visitor's IP or location beyond the single `/api/context` response
- Script injection through the identify form, the URL, the referrer or the sample data
- "Forget me" leaving the cookie or local storage behind

Out of scope:

- The IP geolocation provider you configure with `GEO_PROVIDER_URL`, and what it does with the IPs it receives
- Logging added by your host or proxy in front of the server
- Forks that add their own tracking or destinations

## Running it safely

- Put the server behind a proxy that sets `X-Forwarded-For`. The server takes the first address in that header, so it must not be reachable directly from the internet with a spoofable header.
- If you set `GEO_PROVIDER_URL`, every visitor IP is sent to that provider. Say so on your page.
- Do not add analytics or tag-manager scripts to `index.html`. The page tells visitors no third-party scripts run.
