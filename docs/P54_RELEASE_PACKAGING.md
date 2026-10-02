# P5.4 Release candidate packaging

P5.4 produces a reproducible Chromium release candidate from the fully audited Jammer product build.

## Local release candidate

Run:

```bash
npm ci
npm run release:rc
```

This performs:

1. pinned EasyList network-source verification
2. pinned EasyList cosmetic-source verification
3. full product build
4. deterministic ZIP packaging
5. release security audit

Output:

```text
release/
  jammer-0.6.0-chromium.zip
  jammer-0.6.0-chromium.zip.sha256
  jammer-0.6.0.release.json
```

## Archive contents

The ZIP contains the unpacked Chromium extension plus:

```text
RELEASE_INFO.json
```

The release audit requires:

- Manifest V3
- required permissions exactly `declarativeNetRequest` + `storage`
- optional permission exactly `scripting`
- optional hosts exactly HTTP/HTTPS wildcard access
- no required `host_permissions`
- no static `content_scripts`
- no background/service worker
- `connect-src 'none'`
- `ads_static` DNR contract intact
- all four PNG icon sizes present
- packaged Jammer cover artwork present and valid WebP
- network and cosmetic provenance present
- EasyList third-party notice present
- no TypeScript/source maps in the ZIP
- no raw EasyList source text in the ZIP
- ZIP SHA-256 matches the sidecar and release metadata

## Distribution boundary

P5.4 creates a release candidate artifact only.

It does **not**:

- publish to Chrome Web Store
- publish to Microsoft Edge Add-ons
- create an automatic public GitHub Release
- introduce update infrastructure
- add telemetry or remote code

Store publication requires a separate review of listing copy, screenshots, privacy disclosures, and store-specific policies.
