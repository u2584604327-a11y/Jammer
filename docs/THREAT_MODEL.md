# Threat Model

## Assets

- user browsing privacy
- browser integrity
- local preferences and allowlists
- trust in blocking behavior

## Adversaries and failures

- malicious rule source
- compromised remote update channel
- over-broad extension permissions
- malicious web page trying to interact with the extension
- filter rules causing false positives
- supply-chain compromise
- accidental logging of visited URLs
- future content classifier leaking page contents

## P1 controls

- no remote code
- no remote rule update
- bundled rules only
- no content scripts
- no browsing-history collection
- no telemetry
- minimal permissions
- no credentials, cookies, or form-data access
- deterministic build/tests where practical
- dependency review before additions

## P6.0 content-filter controls

- content filtering is opt-in;
- every content category is opt-in;
- classification is local and uses packaged weighted keyword rules;
- scanned page text is not uploaded to a Jammer server;
- warnings explain category and matched signals;
- warning overlays can be dismissed immediately;
- content-filter exceptions are separate from the ad-block allowlist;
- no remote model, API, or classifier is used;
- optional site access is shared with cosmetic filtering and removed when neither feature needs it.

## Explicit non-protections

Jammer does not claim to:

- remove every advertisement
- defeat every anti-adblock system
- protect against all malware/phishing
- semantically understand page meaning
- identify every undesirable page
- provide parental-control guarantees
- prevent determined users from bypassing a warning
- prevent a browser or operating-system compromise

## Security boundary

The browser's Declarative Net Request engine performs network blocking. Jammer supplies reviewed rules and local settings; it should not become a general-purpose network observer.
