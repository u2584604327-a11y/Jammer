# P1 Browser Runtime Verification

This procedure closes the final P1 acceptance gap without using real advertising sites.

## Preconditions

- Node.js 22 or newer.
- Microsoft Edge, Google Chrome, or Chromium.
- PR #2 checked out at its current reviewed HEAD.

## Build

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

All commands must pass before runtime testing.

## Load the extension

1. Open `edge://extensions` or `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked**.
4. Select the repository's `dist/` directory.
5. Confirm there is no manifest/ruleset error.

Expected permissions:

- `declarativeNetRequest`
- `storage`

Expected absence:

- host permissions
- content scripts
- background/service worker
- tabs/history/cookies/webRequest/scripting

## Deterministic DNR fixture

Start the repository-owned local fixture:

```bash
npm run runtime:fixture
```

Open:

```text
http://127.0.0.1:8765/
```

With **Protection ON** and **Ads rule group ON**:

- Clean script: `LOADED`
- Ad fixture: `BLOCKED / NOT LOADED`
- Page verdict: `Protection-on expectation: PASS`

Then turn Jammer protection OFF from the popup and reload the page.

Expected:

- Clean script: `LOADED`
- Ad fixture: `LOADED`

Turn protection back ON and reload. The ad fixture must be blocked again.

The fixture rule is intentionally exact:

```text
http://127.0.0.1:8765/jammer-fixture/ad.js
```

It exists only for deterministic P1 runtime validation.

## Popup verification

Confirm:

- popup opens
- Jammer title is visible
- Protection toggle loads
- ON/OFF state text updates
- Options button opens the Options page

## Options verification

Confirm:

- Jammer protection toggle works
- Ads rule-group toggle works
- manual allowlist accepts `example.com`
- `https://example.com/path` normalizes to `example.com`
- duplicate entry is rejected
- invalid entry is rejected
- remove works
- Content filtering is marked "Coming later"

## Allowlist DNR state

Because P1 does not request tab access and this fixture does not depend on a public site, semantic per-site allowlist blocking is not part of the deterministic fixture.

For an implementation-level check, inspect the Options extension page and run:

```js
chrome.declarativeNetRequest.getDynamicRules().then(console.log)
```

After adding `example.com`, expect one Jammer-managed high-priority `allow` rule with:

- `initiatorDomains: ["example.com"]`
- action `allow`
- rule ID at or above `1000000`

After removing the domain, that Jammer-managed rule must disappear.

## Network/privacy verification

Open DevTools for popup and Options while interacting with Jammer.

Expected:

- no extension-originated external requests
- no remote rules
- no telemetry
- no page scanning

The extension CSP includes `connect-src 'none'`.

## Acceptance record

Record:

```text
BROWSER_NAME=
BROWSER_VERSION=
EXTENSION_LOAD=
POPUP=
OPTIONS=
PROTECTION_TOGGLE=
ADS_RULESET_TOGGLE=
DNR_FIXTURE_ON=
DNR_FIXTURE_OFF=
ALLOWLIST_UI=
ALLOWLIST_DYNAMIC_RULE=
PERMISSIONS_RUNTIME=
EXTERNAL_NETWORK=
BLOCKED=
```

Do not merge P1 while `EXTENSION_LOAD`, `DNR_FIXTURE_ON`, or `DNR_FIXTURE_OFF` is unverified.
