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

## Explicit non-protections

P1 does not claim to:

- remove every advertisement
- defeat anti-adblock systems
- protect against all malware/phishing
- classify page meaning
- provide parental-control guarantees
- prevent a browser or operating-system compromise

## Security boundary

The browser's Declarative Net Request engine performs network blocking. Jammer supplies reviewed rules and local settings; it should not become a general-purpose network observer.
