# Roadmap

## P0 - specifications

- product scope
- permission model
- threat model
- filtering architecture
- privacy model
- Work/Codex handoff

## P1 - minimal ad blocker

- Manifest V3 skeleton
- static DNR rules
- popup
- options page
- enable/disable
- local allowlist
- tests
- build
- real browser verification

No content scripts in P1.

## P2 - rule management

- rule-group toggles
- rule diagnostics
- deterministic rule compiler/validator
- provenance metadata
- license review for any third-party lists

## P3 - cosmetic filtering experiment

Only after explicit review:

- minimal content-script architecture
- optional site access
- cosmetic selectors
- false-positive recovery

## P4 / P6.0 - user-controlled content categories

Implemented in P6.0:

- explicit category settings
- local-first weighted matching
- explainable match reason
- separate per-site content exceptions
- no hidden category activation
- warning overlay instead of destructive blocking
- no remote classifier or page-text upload

## P5 - cross-browser compatibility

- Firefox desktop
- mobile compatibility track where browser extension APIs permit it

Do not treat mobile Chromium extension support as a P1 acceptance target.

## P6 - distribution hardening

- reproducible release process
- permission regression checks
- privacy/security review
- store packaging
