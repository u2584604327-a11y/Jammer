# Privacy Design

## P1 privacy baseline

Jammer is local-first.

P1 must not:

- send telemetry
- send analytics
- upload visited URLs
- upload page contents
- upload search terms
- create user accounts
- synchronize settings to a Jammer server
- fetch executable code
- fetch remote rules

## Local data

Local storage, if used, may contain only configuration such as:

- enabled rule groups
- allowlisted sites
- UI preferences

It must not intentionally store browsing history.

## Logging

Production logging must never record full visited URLs, page text, credentials, cookies, or form values.

## Future remote updates

If remote rule updates are ever added, they require a separate design covering authenticity, rollback, provenance, privacy, cache behavior, and failure handling.
