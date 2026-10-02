![Jammer](assets/brand/social-preview.svg)

# Jammer

Jammer is a local-first Manifest V3 browser extension for ad/script blocking, tracker blocking, known-phishing navigation blocking, optional HTTPS navigation upgrade, page-ad cleanup, and opt-in local content-block masking.

## Current capabilities

- **Network ad blocking:** pinned EasyList ad-server domains plus broader EasyList general/specific/third-party network filters compiled at build time. The normal ad toggle controls both rulesets, covering many banner images, ad scripts, frames, XHRs, and path-based ad requests.
- **Privacy / tracker blocking:** pinned EasyPrivacy tracking-server source compiled at build time; blocks known tracker scripts, pixels, XHR, pings, and embedded requests without runtime list download.
- **Known-phishing blocking:** a pinned active Phishing-Database snapshot is compiled at build time and blocks top-level/embedded navigation to listed phishing domains.
- **Dangerous-site list:** user-managed local domain list blocks top-level and embedded navigation to listed domains, including redirects that land on a listed domain.
- **HTTPS navigation upgrade:** optional HTTP→HTTPS upgrade for top-level and embedded navigation; disabled by default because HTTP-only legacy sites can break.
- **Page ad cleanup:** optional packaged cosmetic CSS plus local heuristics for self-hosted, dynamically inserted, and standard-size/banner ads.
- **Content filtering:** opt-in local high-recall matching for gambling, explicit sexual material, graphic violence, scam-like promotion, and clickbait/nuisance content; scans large/dynamic pages in batches and hides only each matched block.
- **Bilingual UI:** Auto / 中文 / English.
- **Branded options cover:** packaged Jammer artwork shown locally inside the extension settings UI.
- **Local exceptions:** separate ad-block allowlist and content-filter exception list, both stored only in extension storage.
- **Reversible permissions:** page cleanup/content filtering use optional scripting + site access; HTTPS upgrade uses optional site access only. Unneeded optional permissions are removed.
- **No telemetry:** no analytics, account system, cloud sync, or runtime filter-list download.
- **DNS boundary:** Jammer can block URL/domain requests but cannot detect a poisoned DNS answer that maps an otherwise allowed hostname to the wrong IP; browser Secure DNS remains a separate protection.

## Privacy policy

Public bilingual policy: [PRIVACY.md](PRIVACY.md)

Standalone page source: [`docs/privacy/index.html`](docs/privacy/index.html)

## Privacy and permission model

Required permissions:

```text
declarativeNetRequest
storage
```

Optional permissions used only for page ad cleanup, content filtering, or the explicit HTTPS-upgrade feature:

```text
scripting
http://*/*
https://*/*
```

Jammer does not request `tabs`, `history`, `cookies`, `webRequest`, `debugger`, or `nativeMessaging`.

## Build

Development build:

```bash
npm ci
npm run build
```

Full pinned-EasyList product build:

```bash
npm run build:product
```

Output:

```text
dist-product/
```

Brand assets:

```bash
npm run brand:generate
npm run brand:preview
```

The social-preview generator produces a 1280×640 PNG under `generated/brand/social-preview.png`. The vector source is kept at `assets/brand/social-preview.svg`.

## Release candidate

Build and audit the installable Chromium ZIP:

```bash
npm run release:rc
```

The audited files are written under `release/`. See [P5.4 release packaging](docs/P54_RELEASE_PACKAGING.md).

## Filter provenance

Jammer pins reviewed EasyList source files to a specific upstream commit and verifies source identity before product compilation. Generated product builds include:

- `PROVENANCE.json`
- `AD_NETWORK_PROVENANCE.json`
- `PRIVACY_PROVENANCE.json`
- `PHISHING_PROVENANCE.json`
- `COSMETIC_PROVENANCE.json`
- `THIRD_PARTY_NOTICES.txt`

The extension does not update filter lists at runtime.

## Design principles

- **Local first.** User settings and filtering behavior stay on-device.
- **Minimal required permissions.** Broad site access is optional, not required at install.
- **Explainable and reversible.** Protection, page cleanup, language, and allowlist are explicit controls.
- **Browser-native enforcement.** Network blocking uses Chromium's DNR engine rather than a proxy or interception layer.
- **No remote code.** Runtime logic and filtering resources are packaged with the extension.

## Documentation

- [Product specification](docs/P0_PRODUCT_SPEC.md)
- [Permission model](docs/PERMISSION_MODEL.md)
- [Filtering architecture](docs/FILTERING_ARCHITECTURE.md)
- [Threat model](docs/THREAT_MODEL.md)
- [Privacy design](docs/PRIVACY.md)
- [P3.5 EasyList product integration](docs/P35_PRODUCT_EASYLIST.md)
- [P4.1 cosmetic filtering](docs/P41_COSMETIC_FILTERING.md)
- [P4.2 bilingual popup](docs/P42_BILINGUAL_POPUP.md)
- [P4.3 EasyList cosmetic filtering](docs/P43_EASYLIST_COSMETIC.md)
- [P5.5 cover integration](docs/P55_COVER_INTEGRATION.md)
- [P5.6 store listing preparation](docs/P56_STORE_LISTING.md)
- [P5.7 privacy policy](docs/P57_PRIVACY_POLICY.md)
- [P6.0 local content filtering](docs/P60_CONTENT_FILTERING.md)
- [P6.1 element-level content masking](docs/P61_ELEMENT_CONTENT_MASKING.md)
- [P6.2 network privacy and navigation protection](docs/P62_NETWORK_PRIVACY.md)
- [P6.3 enhanced ad and ad-script blocking](docs/P63_ENHANCED_AD_BLOCKING.md)
- [P6.4 phishing and secure navigation](docs/P64_PHISHING_SECURE_NAVIGATION.md)
- [P6.5 high-coverage filtering](docs/P65_HIGH_COVERAGE_FILTERING.md)
- [Security](SECURITY.md)

## Status

The current Jammer 0.9.1 product build is intended for unpacked-extension testing and validation. Store publication remains a separate release step.
