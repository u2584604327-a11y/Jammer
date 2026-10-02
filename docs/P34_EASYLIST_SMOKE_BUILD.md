# P3.4 Pinned EasyList smoke build

P3.3 established that Edge accepts and enforces realistic 204-entry `requestDomains` arrays.

P3.4 connects the reviewed EasyList snapshot to Jammer's build tooling without changing the normal product build.

## Build profiles

### Normal Jammer build

```bash
npm run build
```

Properties:

- offline after dependencies are available
- repository-owned P1 validation rules
- output: `dist/`
- no EasyList download

### Pinned EasyList smoke build

```bash
npm run smoke:easylist
```

This performs:

1. Download the exact pinned EasyList commit.
2. Verify byte length.
3. Verify SHA-256.
4. Run the deterministic P2/P3.2 parser and requestDomains bucket compiler.
5. Enforce the P3.1 expected compiler baseline.
6. Generate 256 block rules.
7. Generate provenance/report metadata.
8. Build an isolated unpacked extension under:
   `dist-easylist-smoke/`

The raw upstream list is held only in memory and is not written into the repository or smoke package.

## Pinned source

Repository:
`easylist/easylist`

Commit:
`3f284f851f6380a25c0f7e2447f2b01b1c8ee2d8`

Path:
`easylist/easylist_adservers.txt`

Expected SHA-256:
`244344bf3636e070ade00588520ba913c5fcdc3a2049a2d9c27b6352a84f969b`

Expected size:
`995208 bytes`

## Compiler gate

The build fails if the pinned source no longer produces the reviewed baseline:

- accepted domains: 42,940
- rejected rules: 1,774
- duplicates: 1
- emitted requestDomains rules: 256

A future parser change must explicitly update the reviewed baseline rather than silently changing shipped behavior.

## Smoke package

`dist-easylist-smoke/` contains:

- `manifest.json`
- `popup.html`
- `rules/easylist-adservers.json`
- `PROVENANCE.json`
- `THIRD_PARTY_NOTICES.txt`

Permissions:

- `declarativeNetRequest` only

It contains:

- no content scripts
- no background worker
- no host permissions
- no remote-update code
- no runtime fetch
- no telemetry

## Important boundary

P3.4 does **not** yet replace Jammer's normal `dist/` ruleset.

The EasyList smoke profile must first pass real-world browsing tests for:

- observable ad blocking
- basic site compatibility
- representative false-positive behavior
- rule-load success
- no unexpected permissions

Only after that should P3.5 integrate the reviewed ruleset into the normal Jammer product build and wire the existing Protection / Ads controls to it.


## Deterministic sentinel test

Some user environments already block ad-network hostnames at DNS/VPN level. In that case a direct navigation to an EasyList ad domain can fail with `ERR_NAME_NOT_RESOLVED`, which does not prove Jammer blocked it.

The smoke package therefore includes one repository-owned test-only sentinel ruleset:

```text
smoke_sentinel
requestDomains = ["example.com"]
resourceTypes = ["main_frame"]
```

This rule is enabled only in `dist-easylist-smoke/`.

It is **not** present in Jammer's normal product manifest or product rules.

Runtime acceptance:

1. Disable the EasyList smoke extension.
2. Confirm `https://example.com/` loads.
3. Enable the EasyList smoke extension.
4. Reload `https://example.com/`.
5. Expected: browser extension block / `ERR_BLOCKED_BY_CLIENT`.
6. Disable the smoke extension again.
7. Expected: `example.com` loads normally again.

This proves the smoke extension's DNR rulesets are actively loaded even when local DNS already suppresses real ad-network hostnames.

The sentinel does not by itself prove real-world ad-removal quality. That remains a separate compatibility/effectiveness smoke test.
