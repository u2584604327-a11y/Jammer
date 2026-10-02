# P3.2 requestDomains batching experiment

P3.1 found that the pinned EasyList `easylist_adservers.txt` component yields 42,940 accepted simple domain blocks. A one-domain-per-DNR-rule representation exceeds Chrome's guaranteed minimum static-rule capacity.

P3.2 adds an **experimental build-time representation** for the simple domain-only subset using DNR `requestDomains`.

## Why requestDomains

For a simple domain rule such as:

```text
||ads.example.com^
```

Jammer can represent the request-domain match as:

```json
{
  "action": { "type": "block" },
  "condition": {
    "requestDomains": ["ads.example.com"]
  }
}
```

Chrome documents `requestDomains` for Chrome 101+ and states that subdomains of listed domains also match.

## Deterministic bucketing

Domains are assigned to a fixed number of buckets by FNV-1a 32-bit hash:

```text
bucket = hash(domain) % bucketCount
```

Each non-empty bucket becomes one block rule whose `requestDomains` array is sorted.

Default experimental parameters:

- bucketCount: 256
- rule ID base: 10,000,000
- permissions changed: none
- manifest changed: no

This design keeps bucket rule IDs stable across source updates. Adding one domain changes only its bucket content instead of renumbering every later rule.

## P3.1 snapshot projection

For the 42,940 accepted domains in the pinned EasyList adservers snapshot, 256 hash buckets produce:

- emitted rules: 256
- smallest bucket: 135 domains
- largest bucket: 204 domains
- average: 167.73 domains/rule

This is a reduction from 42,940 DNR rules to 256 rules for the domain-only subset.

## Important limitation

Chrome's public API documentation describes `requestDomains` semantics but does not document a maximum number of domain entries per condition array.

Therefore P3.2 **does not ship the batched EasyList output**.

A real Edge/Chrome runtime acceptance test is required before integration. The test must exercise realistic bucket sizes and verify:

- extension load succeeds
- ruleset load succeeds
- representative blocked domains match
- representative non-target domains do not match
- allowlist override remains effective
- no permission expansion occurs

## Safety

P3.2 remains build-time only.

It does not:
- fetch remote lists at runtime
- commit EasyList contents
- enable a large generated ruleset
- add host permissions
- add content scripts
- add webRequest
- add telemetry
