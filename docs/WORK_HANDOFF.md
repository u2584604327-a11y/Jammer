# Work / Codex Handoff

## Current state after P0

P0 defines product and security boundaries. Implementation should begin only after this documentation PR is reviewed.

## First implementation task

Create `feature/p1-mv3-adblock-skeleton` from the latest `main`.

Implement only:

- MV3 extension skeleton
- TypeScript build/test setup
- one bundled static DNR ruleset with repository-owned test domains/patterns
- popup shell
- options shell
- local enable/disable
- local allowlist if achievable without expanding permissions
- manifest permission tests
- DNR rule validation tests

## Hard boundaries

Do not add:

- content scripts
- `<all_urls>`
- `tabs`
- `history`
- `cookies`
- `webRequest`
- `webRequestBlocking`
- `debugger`
- remote APIs
- telemetry
- remote rules
- remote code
- machine-learning classification

If a requested P1 feature cannot be implemented within these bounds, stop and report the exact blocker instead of broadening permissions.

## Required verification

- typecheck
- lint
- unit tests
- build
- manifest permission audit
- DNR rule validation
- real desktop browser load when a browser runtime is available

## PR requirements

Report:

- exact manifest permissions
- exact rule resources
- external network behavior
- tests
- runtime browser status
- blocked items
- next recommended task
