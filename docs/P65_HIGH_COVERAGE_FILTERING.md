# P6.5 High-coverage filtering

P6.5 addresses the real-world gap where domain-only ad blocking and text-only content heuristics leave many visible banners and image-heavy cards untouched.

## Ad coverage

Jammer now combines four local layers:

1. pinned EasyList ad-server rules;
2. broader EasyList general/specific/third-party network rules;
3. generic cosmetic selectors;
4. safe site-specific cosmetic selectors compiled from pinned EasyList data.

Pinned site-specific cosmetic baseline:

- accepted rules: 8,606
- unique domains: 6,552
- rejected unsupported rules: 293

A local dynamic DOM helper applies the site-specific selectors to content added after initial page load.

### Stubborn image banners

Some banner ads are first-party images or CDN images whose requests cannot be safely blocked from URL rules alone.

When Page ad cleanup is enabled, Jammer also applies a conservative local linked-image heuristic. It considers:

- explicit ad/banner/sponsor/promo markers;
- ad-like link or image URL paths;
- pinned gambling/explicit domain signals;
- banner-like dimensions;
- third-party link/image hosts;
- dense strips containing multiple external linked banner images.

A candidate is hidden only after multiple signals reach the local threshold.

## Content-filter recall

Content filtering remains element-level. It does not hide an entire site merely because one card matches.

P6.5 adds:

- URL and media-source signals from href/src/data-src/poster;
- accessibility/title/image-alt signals;
- low-text card support;
- punctuation-obfuscation normalization;
- expanded Chinese and English category vocabulary;
- pinned local domain signals for gambling and explicit-content links.

Pinned category-domain sources:

- StevenBlack/hosts commit `abe587abf7979d93b7a8267d5d3e1fbc32541163`
- gambling-only: 6,673 domains
- porn-only: 76,793 domains
- runtime update: disabled

These domain lists are signals for matching page blocks. They are not silently converted into a global whole-site block.

## Badware / abusive scripts

P6.5 adds a separate `security_static` network ruleset built from pinned uBlockOrigin/uAssets sources:

- badware
- resource abuse

Pinned commit:

`27d3927bd59fcfde571ecba3621bb78c950dcb9d`

Compiler baseline:

- badware accepted: 4,329
- resource-abuse accepted: 60
- total rules: 4,389

The ruleset is enabled by default and has an independent bilingual toggle.

This layer covers many known:

- malicious/badware requests;
- credential-stealing infrastructure;
- abusive scripts;
- miner/resource-abuse scripts.

It does not claim to identify every malicious script dynamically.

## Existing navigation protections retained

P6.5 keeps:

- pinned known-phishing navigation blocking;
- user-managed dangerous-domain blocking;
- optional HTTP→HTTPS navigation upgrade;
- tracker/privacy blocking.

Jammer can block redirects to a bad domain Chromium exposes in the URL. It cannot inspect a poisoned DNS answer that preserves an otherwise allowed hostname.

## Privacy and permissions

No additional required browser permission is introduced.

Required:
- `declarativeNetRequest`
- `storage`

Optional:
- `scripting`
- HTTP/HTTPS site access for page cleanup/content filtering/HTTPS upgrade

All third-party rule inputs are pinned and compiled at build time. Runtime list downloads remain disabled.

## Version

`0.10.0`
