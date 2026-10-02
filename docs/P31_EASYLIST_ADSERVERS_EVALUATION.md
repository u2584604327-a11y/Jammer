# P3.1 EasyList adservers evaluation

Evaluation date: 2026-10-02

## Source identity

Repository:
`easylist/easylist`

Pinned commit:
`3f284f851f6380a25c0f7e2447f2b01b1c8ee2d8`

Commit timestamp:
`2026-10-02T03:16:00Z`

Source component:
`easylist/easylist_adservers.txt`

Git blob SHA:
`a6940dc5accf3e903f5ac1cafa4ed4ff2927eb3d`

Source size:
`995208 bytes`

SHA-256 of the pinned source:
`244344bf3636e070ade00588520ba913c5fcdc3a2049a2d9c27b6352a84f969b`

No third-party list content is committed to Jammer by this evaluation.

## License / provenance

EasyList's official licence page states that, unless otherwise noted, contents of the EasyList repository are dual licensed under:

- GNU GPL v3 or later; or
- Creative Commons Attribution-ShareAlike 3.0 Unported or later.

The licence page also states that attribution to "The EasyList authors" may be required and that externally hosted/referenced subscriptions can have different conditions.

Official licence page:
`https://easylist.to/pages/licence.html`

Repository:
`https://github.com/easylist/easylist`

This evaluation covers the repository component above only. It does not generalize the same terms to unrelated externally hosted lists.

## Jammer P2 compiler evaluation

The P2 compiler currently accepts only a deliberately narrow domain-block subset.

Results for the pinned `easylist_adservers.txt` snapshot:

| Metric | Result |
| --- | ---: |
| Total lines | 44,730 |
| Non-comment candidate rules | 44,715 |
| Accepted unique domain rules | 42,940 |
| Duplicates | 1 |
| Rejected rules | 1,774 |
| Acceptance rate | 96.03% |

### Rejection categories

| Reason | Count |
| --- | ---: |
| adblock-modifier-not-supported | 1,753 |
| complex-adblock-rule-not-supported | 11 |
| regex-rule-not-supported | 9 |
| unsupported-syntax | 1 |

Representative rejected syntax includes:

- resource/document modifiers such as `$script` and `$document`
- non-canonical / complex domain-like Adblock patterns
- regular-expression rules

P3.1 does not broaden the parser merely to raise the acceptance percentage. Each syntax class requires a separate semantics review before support.

## DNR capacity result

Current P2 output is one DNR rule per accepted domain.

That would produce:

`42,940 static block rules`

Chrome currently guarantees at least 30,000 static rules across enabled static rulesets. More may be available depending on the user's installed extensions, but Jammer must not rely on capacity above the guaranteed minimum.

Therefore:

`ONE_DOMAIN_PER_DNR_RULE = NOT_ACCEPTABLE_FOR_DEFAULT_INTEGRATION`

The `easylist_adservers.txt` component alone already exceeds Jammer's guaranteed-capacity budget before adding general block rules, specific block rules, Jammer-owned rules, or other lists.

## Recommended next architecture

For the simple domain-block subset, evaluate DNR `requestDomains` batching.

Chrome DNR `requestDomains` matches request domains and their subdomains and is available in Chrome 101+.

Candidate representation:

```json
{
  "id": 123,
  "priority": 1,
  "action": { "type": "block" },
  "condition": {
    "requestDomains": [
      "ads.example.com",
      "tracker.example.com"
    ]
  }
}
```

This could reduce tens of thousands of domain-only rules to a much smaller number of DNR rules.

However, the batching implementation must be treated as experimental until Edge/Chrome accepts realistic batch sizes at runtime. Jammer must not assume an undocumented maximum array size.

## Decision

P3.1 outcome:

- Source provenance: PASS
- License gate for this repository component: PASS_WITH_ATTRIBUTION_REQUIREMENT
- Current narrow parser usefulness: PASS
- Current one-domain-per-rule output: FAIL_CAPACITY
- Permission expansion required: NO
- Third-party list content committed: NO
- Ready to ship EasyList component: NO
- Next task: P3.2 experimental `requestDomains` batching + browser validation

## Non-goals

This report does not evaluate:

- EasyList cosmetic filters
- EasyList allowlist/exception semantics
- EasyPrivacy
- EasyList regional subscriptions
- externally referenced third-party subscriptions
- dynamic remote list updating
