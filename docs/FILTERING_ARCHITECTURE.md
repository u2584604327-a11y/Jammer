# Filtering Architecture

## Layer 1: network blocking

P1 uses bundled Manifest V3 Declarative Net Request rules.

Rule flow:

```
request
  -> browser DNR engine
  -> bundled static rules
  -> allow / block
```

The extension does not proxy traffic and does not inspect response bodies.

## Layer 2: user exceptions

A user allowlist can exempt selected sites. The design must keep the allowlist local.

## Layer 3: optional content filtering

Deferred beyond P1.

Possible later modes:

- cosmetic selectors
- user-authored keyword rules
- category warning overlays
- domain/category block lists

Any page-reading feature must be opt-in, explainable, reversible, and scoped to the minimum sites necessary.

## Rule provenance

Every bundled rule group should record:

- source
- license
- version/date
- transformation steps
- rule count
- test coverage

P1 should use a small repository-owned test rule set. Importing large third-party lists is deferred until license and compatibility review.

## Rule safety

Rules must be deterministic and data-only. No downloaded JavaScript or remotely executable code is allowed.

## False positives

Jammer must provide:

- per-site disable
- allowlist
- rule-group toggle
- clear recovery path

A filtering rule that cannot be reversed by the user is not acceptable.
