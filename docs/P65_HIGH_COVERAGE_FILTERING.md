# P6.5 High-coverage filtering

P6.5 addresses two observed weaknesses: ads that remain visible despite network blocking, and content filtering that previously examined too small a portion of large/dynamic pages.

## Ad coverage

Jammer keeps the existing build-time pinned EasyList network layers:

- `ads_static` for ad-server domains;
- `ads_extended` for broader EasyList path/banner/script/image/frame/XHR patterns.

When Page ad cleanup is enabled, Jammer now combines:

1. packaged EasyList cosmetic CSS;
2. repository-owned conservative CSS selectors;
3. a packaged local heuristic cleanup script.

The heuristic script can detect common self-hosted/dynamic ads using:

- standard advertising dimensions;
- very wide linked banner geometry;
- cross-origin banner links;
- ad-related id/class/data/ARIA/title markers;
- known advertising-provider URL signals;
- common promotional/gambling banner signals;
- dynamically inserted DOM nodes.

It hides matching elements locally and does not make network requests.

## Content-filter coverage

The previous implementation examined at most 300 candidates during a scan. That hard cap is removed.

P6.5 now:

- scans all eligible content blocks;
- processes candidates cooperatively in batches to reduce long main-thread stalls;
- queues multiple changed subtrees instead of dropping later mutations;
- rescans text changes as well as inserted nodes;
- supports generic `div`, blockquote, and table-cell content blocks in addition to article/feed/card structures;
- inspects bounded local link/image/frame host/path signals;
- handles hundreds or thousands of candidate blocks on one page.

Matched content remains element-level: one bad card does not force the whole page to be hidden.

## Recall changes

The local classifier has broader Chinese/English vocabulary, lower per-element thresholds, repeated-signal bonuses, and limited de-obfuscation/compact matching.

Because higher recall can increase false positives, every hidden block keeps:

- Show this content / 显示这段内容;
- Leave this page / 退出此网页;
- site exception control.

## Privacy

P6.5 does not add any required permission.

The heuristic ad-cleanup and content-classification scripts run only after the user enables their corresponding optional page features and grants site access.

Neither runtime uses a remote classifier, telemetry endpoint, or page-data upload.

## Version

Jammer product version:

`0.9.1`
