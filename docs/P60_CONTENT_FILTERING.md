# P6.0 Local content filtering

P6.0 implements the content-filtering capability that was intentionally deferred from the original P1 scope.

## User-facing behavior

Content filtering is disabled by default.

Each category is also disabled by default:

- gambling / betting promotion
- explicit sexual material
- graphic violence
- scam-like promotion
- clickbait / nuisance content

The user must:

1. open Jammer Options;
2. select at least one category;
3. enable Content filtering;
4. grant the optional website-access permission.

After first enabling the feature, already-open pages should be refreshed once.

## Local classifier

Runtime files:

`content-classifier.js`
`content-filter.js`

The classifier:

- runs locally;
- uses packaged weighted keyword signals;
- scores prominent text (title, description, headings) more heavily than ordinary body text;
- scans at most a bounded amount of visible page text;
- requires a per-category threshold;
- returns the matched category and matched terms.

It is intentionally not described as AI or semantic understanding.

## Warning model

When a selected category crosses its threshold, Jammer displays a full-page warning overlay.

The warning:

- identifies the category;
- shows a small set of matched signals;
- states that false positives are possible;
- allows the user to show the page immediately;
- allows the current site to be added to a local content-filter exception list.

Jammer does not delete the underlying page or permanently block navigation.

## Separate exceptions

Content-filter exceptions are separate from the existing ad-block allowlist.

This means a user can allow page content warnings to be skipped for a site while keeping normal ad blocking active.

## Permissions

Required permissions remain:

`declarativeNetRequest`
`storage`

Optional site capability:

`scripting`
`http://*/*`
`https://*/*`

The optional capability is shared by:

- Page ad cleanup
- Content filtering

It is removed only when neither feature requires it.

## Privacy

When content filtering is enabled, the page script can read limited visible page text.

The implementation:

- does not use a remote classifier;
- does not call a remote API;
- does not upload page text;
- does not upload matched terms;
- does not intentionally read input values or password values;
- does not read browser history or cookies.

## False-positive boundary

P6.0 is a local heuristic warning system.

It does not claim to:

- determine legality;
- detect every scam or phishing page;
- identify every explicit or violent page;
- provide parental-control guarantees;
- understand images or video content;
- semantically understand page meaning.

## Version

Development manifest:

`0.7.0`

Product build:

`0.7.0`

Development and product builds are distinguished by build markers instead of presenting different visible version numbers.

Normal use:

`npm run build:product`

Load:

`dist-product/`
