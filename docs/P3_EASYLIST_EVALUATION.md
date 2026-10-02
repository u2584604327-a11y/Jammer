# P3 EasyList Evaluation

## Decision

EasyList is the first real-world source candidate to evaluate for Jammer.

This phase is evaluation-only. Do not commit the upstream list contents or generated derivative rules until source/licensing and compatibility review is complete.

## Why this source first

- EasyList is a widely used primary ad-blocking list.
- Its syntax exercises the real-world Adblock-style cases Jammer eventually needs to support.
- The official project publishes licensing information and source provenance.
- Jammer P2 already has a deterministic compiler/rejection-report foundation.

## License gate

Before redistribution, record and review the applicable EasyList license terms and attribution requirements.

The official EasyList licensing page states that repository contents are generally dual licensed under GPLv3-or-later or CC BY-SA 3.0-or-later unless otherwise noted. Externally hosted or referenced subscriptions may have different terms.

P3 must not assume that every list linked by EasyList has the same license.

## Evaluation workflow

1. Identify the canonical EasyList network-blocking source file/version.
2. Record:
   - canonical URL
   - repository commit/tag/date
   - cryptographic hash
   - license path/text
   - attribution requirement
3. Download only in a controlled development evaluation step.
4. Run Jammer's compiler in report-only mode.
5. Measure:
   - total source lines
   - supported rules
   - duplicates
   - rejected rules
   - rejection reasons by class
   - generated DNR rule count
6. Inspect representative rejected rules.
7. Check Chrome DNR static-rule limits.
8. Verify no generated action other than block.
9. Run false-positive smoke tests.
10. Decide whether:
    - current compiler is sufficient,
    - parser support should expand,
    - or the source should not be integrated.

## No runtime fetching

P3 must not add runtime list downloads to the extension.

If Jammer later ships an EasyList-derived ruleset, it should be generated during the release/build process from a reviewed pinned source, with provenance metadata.

## Permission boundary

No new extension permissions are authorized in P3.

Still prohibited:
- host permissions
- content scripts
- tabs/history/cookies
- webRequest/webRequestBlocking
- telemetry
- remote executable code

## Chrome DNR capacity gate

Chrome's DNR implementation guarantees a minimum total static-rule capacity and imposes ruleset-count limits. P3 must compare the generated rule count against those documented limits and leave headroom for Jammer-owned rules and future lists.

## Acceptance criteria

P3 is complete only when there is a written evaluation containing:
- canonical source identity
- license/provenance record
- source hash/version
- compile acceptance/rejection statistics
- DNR rule-count result
- unsupported syntax categories
- recommendation on whether to proceed to integration

P3 does not merge third-party filter contents.
