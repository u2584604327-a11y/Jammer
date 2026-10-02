# User-Controlled Content Policy Model

Jammer must not treat "undesirable content" as one opaque category.

## Model

Content controls are explicit user preferences. Current local categories are:

- gambling / betting promotion
- explicit sexual material
- graphic violence
- scam-like promotion
- clickbait / nuisance content

Every category is disabled by default. Enabling the content-filter master switch without selecting a category is not sufficient to activate scanning.

## P6.0 implementation

P6.0 implements local-first, opt-in page-text classification.

When enabled, Jammer:

- requests the existing optional `scripting` + HTTP/HTTPS site-access capability;
- registers packaged content scripts dynamically;
- reads a limited amount of page title, description, headings, and visible body text;
- normalizes text locally;
- scores only user-selected categories using packaged weighted keyword signals;
- shows a full-page warning when a category reaches its threshold;
- shows the responsible category and matched signals;
- lets the user reveal the page immediately;
- lets the user add the current site to a separate local content-filter exception list;
- does not upload page contents or matched terms to a Jammer server.

The content classifier is not an AI service and does not claim semantic understanding.

## False-positive model

P6.0 deliberately prefers a warning overlay over destructive removal or navigation blocking.

This means:

- the underlying page is not deleted;
- the user can dismiss the warning for the current page;
- site exceptions are reversible;
- false positives do not make the page inaccessible;
- false negatives remain possible.

Weighted thresholds reduce accidental matching from isolated generic words, but do not eliminate false positives.

## Category boundaries

The scam-like category is a local warning heuristic, not a phishing/malware security guarantee.

Jammer does not claim to identify all fraud, phishing, malware, illegal material, or unsafe sites.

A future security-list feature would require separate provenance, update, and false-positive handling.

## Permission boundary

Page-text classification requires DOM access and therefore uses the same optional site-access capability already used by page-ad cleanup.

The permission remains optional and is removed when neither page-ad cleanup nor content filtering needs it.

Jammer does not request `tabs`, `history`, `cookies`, `webRequest`, `debugger`, `downloads`, or `nativeMessaging`.

## Data boundary

P6.0 does not intentionally read form field values, password values, cookies, browser history, or search history.

Visible page text used for classification is processed transiently in the page and is not stored as browsing history or transmitted to a Jammer server.
