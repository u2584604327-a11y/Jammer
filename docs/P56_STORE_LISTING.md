# P5.6 Store listing preparation

This phase prepares Jammer for manual browser-store submission without publishing it.

## Current product artifact

Main product version:

`0.8.1`

Release candidate:

`jammer-0.8.1-chromium.zip`

## Store visual assets

Prepared outside the extension package:

- `jammer-logo-300x300.png`
- `jammer-small-promo-440x280.png`
- `jammer-marquee-1400x560.png`

For Microsoft Edge Add-ons, current documentation specifies:

- extension logo: 1:1, recommended 300×300, minimum 128×128
- small promotional tile: 440×280
- large promotional tile: PNG, 1400×560
- screenshots: 640×480 or 1280×800, up to 6

Store visual assets are uploaded separately from the extension ZIP.

## Listing languages

Prepared:

- English
- 简体中文

See:

- `docs/store/EN.md`
- `docs/store/ZH-CN.md`

## Manual items still required before public submission

1. Capture real browser screenshots from the final 0.8.1 build.
2. Privacy policy is prepared at `PRIVACY.md`; use the public repository URL if a store submission is ever resumed.
3. Choose publisher/developer identity.
4. Review store-specific declarations and category.
5. Upload the audited ZIP and visual assets manually.
6. Submit for store review.

## Screenshots to capture

Recommended screenshot set:

1. Popup — Protection + Page ad cleanup enabled.
2. Options — bilingual controls, content categories, ad-block allowlist, and content-filter exceptions.
3. Local content-per-element placeholder showing the matched category and signals.
4. Permission prompt / explicit optional site-access flow.
5. Dark-mode UI.
6. English/Chinese interface comparison if useful.

Do not manufacture screenshots that imply functionality the extension does not provide.

## Publication boundary

P5.6 does not:
- publish to a store
- create or accept store legal declarations on the user's behalf
- submit the privacy URL to a store
- enable automatic updates
