# Jammer P0 Product Specification

## Product intent

Jammer is a local-first browser extension that blocks ads and gives users explicit control over unwanted web content.

The project separates two concerns:

1. **Network blocking**: block known ad/tracker requests with declarative browser rules.
2. **Content filtering**: later, optionally hide or warn on user-selected content categories with clear explanations and reversible controls.

P1 implements only the first concern plus basic settings/UI.

## P1 target

- Desktop Chromium browsers using Manifest V3.
- Static, bundled `declarativeNetRequest` rules.
- Minimal popup/options UI.
- User allowlist.
- Local settings only.
- No telemetry.
- No remote rule updates.
- No content scripts.
- No page-text scanning.
- No browsing-history collection.

## User-facing principles

- Filtering is user-controlled and reversible.
- Users can disable Jammer globally or per site.
- A blocked item should have a reason that can be inspected when technically feasible.
- No category is silently enabled except the default ad-blocking rule set.
- "Unwanted" or "harmful" content categories are configuration choices, not hidden judgments by the extension.

## P1 success criteria

- Extension loads in a desktop Chromium browser.
- Bundled ad test fixtures are blocked by DNR rules.
- Non-target fixtures are not blocked.
- Allowlist can disable blocking for a chosen site.
- No external network request is made by Jammer itself.
- Manifest contains no content scripts and no broad host permissions unless later proven necessary and separately reviewed.
- Unit tests, manifest checks, and build checks pass.

## Deferred

- Cosmetic filtering.
- DOM-based keyword/category filtering.
- Remote filter-list updates.
- Machine-learning classification.
- Firefox and mobile compatibility.
- Sync.
