# P5.7 Privacy policy

P5.7 creates a public, bilingual privacy policy that matches Jammer's current runtime and permission model.

## Public policy

Canonical repository policy:

`PRIVACY.md`

Public URL after merge:

`https://github.com/u2584604327-a11y/Jammer/blob/main/PRIVACY.md`

The repository is public, so the policy can be read without installing Jammer.

## Standalone page source

A self-contained bilingual HTML version is also stored at:

`docs/privacy/index.html`

It contains no remote scripts, fonts, images, analytics, or telemetry.

This file can later be hosted through GitHub Pages, Vercel, or another static host if a dedicated privacy-policy domain is desired.

## Policy scope

The policy documents:

- local `jammerSettings` storage;
- protection, network filtering, page cleanup, language, and allowlist settings;
- no Jammer-operated analytics, telemetry, account, cloud-sync, or remote filter-update service;
- build-time EasyList use;
- browser-native `declarativeNetRequest` filtering;
- optional `scripting` and HTTP/HTTPS site access for CSS-only page cleanup;
- removal of optional access when page cleanup is disabled;
- opt-in local processing of limited page text for content-category matching;
- no upload of scanned page text or matched terms;
- no intended reading of form values, passwords, browsing history, or cookies;
- local retention and deletion behavior;
- public GitHub Issues contact path.

## Version note

Starting with P6.0, both development and product manifests use version `0.7.1` so browser extension pages no longer show a confusing older development version.

The profiles are still distinguished by their build markers and rule resources. For normal use, load only `dist-product/`.

P6.0 extends the privacy policy because content filtering can locally inspect visible page text when the user explicitly enables it.
