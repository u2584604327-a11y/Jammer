# P6.1 Element-level content masking

P6.1 changes Jammer's content filtering from page-wide interruption to selective in-page masking.

## Behavior

Jammer scans bounded candidate blocks such as:

- articles;
- feed/list items;
- cards/posts/stories/results;
- comments;
- figures;
- paragraphs;
- recommendation/video/news/content containers.

Smaller/deeper candidates are evaluated before larger parents. This prevents one matching card from automatically hiding an entire feed.

## Higher recall

P6.1 improves recall by:

- expanding Chinese and English category variants;
- bounded repeated-term scoring;
- small multi-signal bonuses;
- reading local `aria-label`, `title`, and image `alt` text;
- rescanning dynamic content with MutationObserver;
- delayed rescans after initial page load.

The classifier remains heuristic. Higher recall can also increase false positives, so thresholds and per-block reveal controls remain.

## Placeholder controls

For each masked block Jammer inserts a local placeholder containing:

- matched category;
- matched signals;
- Show this content / 显示这段内容;
- Leave this page / 退出此网页;
- Skip content filtering on this site / 此网站不做内容过滤.

The leave-page action uses browser history when available and falls back to `about:blank`. It does not require the `tabs` permission.

## Privacy

All text analysis remains local. Jammer does not upload the page text, matched terms, or content decisions.

## Version

Jammer product version:

`0.7.1`
