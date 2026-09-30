# Jammer

Jammer is a local-first browser extension project for blocking ads and reducing unwanted or harmful web content with transparent, user-controlled rules.

## Initial goals

- Manifest V3 desktop Chromium extension.
- Declarative ad blocking with minimal permissions.
- Local rules by default; no telemetry and no remote code.
- Clear allowlists, rule explanations, and user-controlled content categories.
- Privacy-preserving architecture that avoids reading page contents unless a later feature explicitly requires it.

## Non-goals for P1

- No credential collection.
- No browsing-history analytics.
- No remote classifier.
- No arbitrary remote code or remotely executed rules.
- No content-script based page scanning.
- No hidden censorship or irreversible filtering.

Development starts with P0 specifications before implementation.
