# P2 Rule Pipeline

## Goal

P2 builds a deterministic, auditable conversion pipeline for network-blocking filter sources before Jammer imports any large third-party list.

P2 does **not** widen extension permissions and does not add content scripts, remote runtime fetching, telemetry, cosmetic filtering, or page scanning.

## Pipeline

```
local source file
  -> source metadata / provenance
  -> parse supported syntax
  -> normalize domains
  -> deduplicate
  -> stable deterministic rule IDs
  -> Manifest V3 DNR block rules
  -> machine-readable compile report
```

## Supported source syntax in P2

The first compiler intentionally supports a narrow subset:

- Adblock-style domain block: `||ads.example.com^`
- hosts-style entries:
  - `0.0.0.0 ads.example.com`
  - `127.0.0.1 ads.example.com`
- plain domains only when metadata declares `format: "domains"`

Unsupported syntax is reported, never silently reinterpreted. Examples intentionally rejected in P2 include:

- exception rules beginning with `@@`
- cosmetic rules using `##` / `#@#`
- redirect rules
- request/response header modification
- regex filters
- wildcard/path filters
- Adblock modifiers such as `$script`, `$third-party`, etc.

## Provenance gate

Every source must have metadata containing at least:

- stable source id
- human-readable title
- declared format
- license identifier/text
- source URL or explicit repository-owned provenance
- remote update policy

P2 runtime never downloads lists. Source ingestion is a development/build-time process only.

A real third-party list must not be committed or distributed until its license and redistribution terms are reviewed.

## Determinism

Compiler output is independent of input ordering after normalization:

- domains are lowercased
- trailing dots are removed
- duplicates are removed
- domains are sorted
- rule IDs are deterministic from normalized domain values
- hash collisions are resolved deterministically

## Output

The compiler emits:

1. DNR rules JSON.
2. Compile report containing source metadata, accepted count, duplicate count, rejected count, and rejected-line reasons.

## Security properties

P2 must not introduce:

- `<all_urls>`
- content scripts
- `tabs`
- `webRequest`
- remote source downloads
- remote executable code
- telemetry
- browsing-history storage

The generated rule action is block-only.

## Acceptance

- deterministic output for reordered equivalent inputs
- invalid domains rejected
- unsupported syntax reported
- duplicate domains deduplicated
- stable rule IDs
- no redirect/modifyHeaders generation
- existing P1 manifest permission tests stay green
