# P6.3 Enhanced ad and ad-script blocking

P6.3 addresses ads that can remain visible when domain-only ad-server blocking is not enough.

## Why the previous rules missed some ads

The earlier product ruleset primarily blocked known ad-server domains. A page can still load advertisements from:

- first-party paths such as `/ads/`;
- CDN paths that also serve normal site assets;
- dedicated ad JavaScript files;
- banner image paths;
- site-specific ad endpoints;
- third-party domains covered by broader EasyList network rules rather than the ad-server-only list.

## Broader EasyList network rules

The product build now compiles three additional pinned EasyList sources:

- `easylist_general_block.txt`
- `easylist_specific_block.txt`
- `easylist_thirdparty.txt`

Pinned commit:

`3f284f851f6380a25c0f7e2447f2b01b1c8ee2d8`

The compiler accepts a conservative subset that maps directly to Chromium DNR:

- URL/path filters;
- script/image/stylesheet/XHR/subframe/font/media/object/ping/WebSocket types;
- first-party / third-party constraints;
- initiator-domain include/exclude conditions.

Unsupported redirect/rewrite actions and exception semantics are rejected rather than guessed.

Current pinned baseline:

- general block: 974 compiled rules;
- specific block: 886 compiled rules;
- third-party: 1,858 compiled rules;
- total: 3,718 rules.

## User control

The normal Network ad & script blocking toggle controls both:

- `ads_static` — ad-server domain rules;
- `ads_extended` — broader path/script/banner/network rules.

Privacy / tracker blocking remains independently controllable through `privacy_static`.

## Page-level cleanup

The optional Page ad cleanup feature also includes conservative selectors for explicit banner/ad-box markers such as:

- banner-ad;
- ad-banner;
- adsbox;
- adbox;
- ad-wrap;
- advertisement.

This is a second layer for ad containers that remain after network requests are blocked.

## Privacy and permission boundary

No new browser permission is added.

The network rules are compiled at build time from pinned source snapshots. Jammer does not download filter lists at runtime and does not inspect request contents.

## Version

Jammer product version:

`0.8.1`
