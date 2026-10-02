# P3.5 Jammer product EasyList integration

P3.5 connects the reviewed EasyList domain-blocking rules to the full Jammer UI without changing the extension's existing control contract.

## Build

```bash
npm run build:product
```

Output:

```text
dist-product/
```

This command:

1. Downloads the exact pinned EasyList source at build time.
2. Verifies byte size and SHA-256.
3. Compiles 42,940 accepted domains into 256 deterministic `requestDomains` rules.
4. Builds the existing Jammer popup/options UI.
5. Packages the generated EasyList rules as the existing `ads_static` ruleset.
6. Adds provenance and third-party notices.

## Existing controls

The ruleset ID remains:

```text
ads_static
```

Therefore the existing Jammer controls continue to apply:

- Protection OFF disables the real network-ad ruleset.
- Protection ON enables it when Ads is enabled.
- Ads rule group OFF disables it.
- The existing local allowlist remains represented as higher-priority dynamic allow rules.

No new runtime API is needed for network blocking.

## Product package

`dist-product/` contains:

- Jammer popup/options
- compiled runtime JavaScript
- `manifest.json`
- `rules/easylist-adservers.json`
- `PROVENANCE.json`
- `THIRD_PARTY_NOTICES.txt`

Version:

```text
0.2.0
```

Popup build marker:

```text
Build: p35-easylist-product
```

## Privacy and permission boundary

P3.5 keeps the same permissions as P1:

- `declarativeNetRequest`
- `storage`

No:

- host permissions
- content scripts
- tabs
- browsing-history access
- runtime EasyList download
- telemetry

## Important limitation

This is network-level ad blocking only.

Advertisements rendered from first-party page markup or already-loaded ad containers may remain visible as blank/placeholder elements.

Page-internal visual cleanup belongs to P4 cosmetic filtering and requires a separate explicit permission design.
