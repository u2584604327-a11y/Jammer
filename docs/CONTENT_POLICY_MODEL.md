# User-Controlled Content Policy Model

Jammer must not treat "undesirable content" as one opaque category.

## Model

Content controls are explicit user preferences. Future categories may include, for example:

- intrusive ads
- scam/phishing domains
- gambling promotion
- explicit sexual material
- graphic violence
- clickbait or nuisance overlays

A category must not be enabled silently merely because it exists.

## P1

Only ad/network blocking is implemented.

No page text, images, search queries, messages, or form contents are read.

## Future category-filtering requirements

A future category filter must:

- be opt-in except for clearly documented security lists
- show the category responsible for a block/warning
- support per-site exceptions
- support immediate disable
- keep classification local when practical
- document false-positive expectations
- avoid transmitting page contents to a remote service by default

## Security lists

Phishing/malware protection, if added later, is a separate security feature from subjective content categories and must have independent provenance, update, and false-positive handling.
