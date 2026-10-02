# P3.3 DNR runtime diagnostics

This is an **isolated validation extension**, not the Jammer product extension.

Purpose: identify why the first 204-entry `requestDomains` fixture did not block `example.com` in Edge.

## Diagnostic modes

The popup can switch between four modes:

1. **Off** — all fixture rulesets disabled.
2. **urlFilter baseline** — one rule blocks `example.com` via `urlFilter`.
3. **requestDomains ×1** — one rule blocks `example.com` via a single-entry `requestDomains` array.
4. **requestDomains ×204** — one rule contains 204 `requestDomains` entries, including `example.com`.

All rules explicitly target `main_frame`.

## Why this isolates the failure

Interpretation:

| Result | Meaning |
| --- | --- |
| urlFilter FAIL | General DNR/navigation issue; do not blame requestDomains batching |
| urlFilter PASS, ×1 FAIL | Edge requestDomains behavior/integration issue |
| ×1 PASS, ×204 FAIL | Large requestDomains array is the problem |
| ×1 PASS, ×204 PASS | First fixture failure came from its previous shape/load state, not array size |

## Load

No build is required.

1. Fetch PR #8 branch.
2. Open `edge://extensions`.
3. Remove the older P3.3 fixture if present.
4. **Load unpacked**:
   `fixtures/p33-requestdomains/`
5. Confirm version is `0.0.2`.
6. The extension is now clickable because it has a diagnostic popup.

## Test sequence

Start with `https://example.com/` loading normally.

### Mode 0 — Off

Open popup → **0. Off** → refresh example.com.

Expected: loads normally.

### Mode 1 — urlFilter baseline

Open popup → **1. urlFilter baseline** → refresh example.com.

Expected: blocked / `ERR_BLOCKED_BY_CLIENT`.

### Mode 2 — requestDomains ×1

Open popup → **2. requestDomains ×1** → refresh example.com.

Expected: blocked.

### Mode 3 — requestDomains ×204

Open popup → **3. requestDomains ×204** → refresh example.com.

Expected: blocked if realistic bucket size is supported.

## Acceptance record

```text
BROWSER_NAME=
BROWSER_VERSION=
FIXTURE_VERSION=0.0.2
FIXTURE_LOAD=
MODE_OFF=
MODE_URLFILTER=
MODE_REQUESTDOMAINS_1=
MODE_REQUESTDOMAINS_204=
RULESET_ERROR=
PERMISSIONS_RUNTIME=
BLOCKED=
```

## Security

The fixture still has:

- `declarativeNetRequest` only
- no host permissions
- no content scripts
- no background/service worker
- no webRequest
- no telemetry
- no remote requests

The fixture is not copied into Jammer's production `dist/` and must not be published.
