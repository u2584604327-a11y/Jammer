# Jammer

Jammer is a local-first browser extension for blocking ads and giving users transparent, reversible control over unwanted web content.

## P1 target

- Desktop Chromium browsers, Manifest V3.
- Declarative ad blocking with bundled `declarativeNetRequest` rules.
- Minimal popup/options UI.
- Local settings and allowlist.
- No telemetry, remote rules, remote code, content scripts, or page-text scanning.

## Design principles

- **Minimal permissions.** P1 does not request broad host access or page-reading permissions.
- **Local first.** Settings and filtering stay on-device.
- **Explainable and reversible.** Users can disable rule groups and recover from false positives.
- **No hidden content policy.** Future content categories are explicit user choices.
- **No homemade browser interception layer.** Network blocking is delegated to the browser DNR engine.

## Specifications

- [P0 product specification](docs/P0_PRODUCT_SPEC.md)
- [Permission model](docs/PERMISSION_MODEL.md)
- [Filtering architecture](docs/FILTERING_ARCHITECTURE.md)
- [User-controlled content policy model](docs/CONTENT_POLICY_MODEL.md)
- [Threat model](docs/THREAT_MODEL.md)
- [Privacy design](docs/PRIVACY.md)
- [Roadmap](docs/ROADMAP.md)
- [Work / Codex handoff](docs/WORK_HANDOFF.md)
- [Security](SECURITY.md)

## P1 non-goals

- No DOM/content scanning.
- No cosmetic filtering.
- No remote classifier.
- No remote filter-list updates.
- No browsing-history analytics.
- No credential, cookie, or form-data access.
- No mobile acceptance target in P1.

Development starts with P0 specifications before implementation.
