# P6.4 Phishing and secure navigation

P6.4 completes Jammer's navigation-protection layer without turning the extension into a traffic proxy or DNS resolver.

## Known-phishing navigation blocking

Product builds compile a pinned active-domain snapshot from:

- repository: `Phishing-Database/Phishing.Database`
- commit: `6874727d671bb56765fd1fbfa15bc5f8b79ae63f`
- source: `phishing-domains-ACTIVE/phishing-domains-ACTIVE2.txt`
- Git blob SHA-1: `6adc5d0bc92feda2654ff4b7a882dc6a168b8705`
- license: MIT

Pinned compiler baseline:

- accepted domains: 21,552
- invalid lines rejected: 84
- duplicates removed: 3
- DNR bucket rules: 64
- runtime source update: no

The generated `phishing_static` ruleset blocks:

- `main_frame`
- `sub_frame`

for domains present in the snapshot.

A redirect that ultimately requests a listed phishing domain is therefore blocked before that destination document loads.

The feature is enabled by default but independently controllable.

## Manual dangerous-site list

The existing local dangerous-site list remains available for user-defined domains.

It is separate from the packaged phishing snapshot so the user can add a domain immediately without waiting for a new Jammer build.

## Optional HTTP to HTTPS navigation upgrade

P6.4 adds an Options-only switch:

`Upgrade HTTP navigation to HTTPS`

It is disabled by default because some legacy sites still support only HTTP.

When enabled:

1. Jammer asks for optional HTTP/HTTPS host access.
2. A dynamic DNR rule with action `upgradeScheme` is created.
3. The rule is restricted to `main_frame` and `sub_frame`.
4. The rule matches navigation beginning with `http://`.

No `tabs`, `history`, `webRequest`, proxy, or DNS permission is added.

## DNS boundary

Jammer can make decisions using the URL/domain Chromium exposes for a request.

It can:
- block redirects to a listed domain;
- block direct navigation to a listed domain;
- upgrade HTTP page navigation to HTTPS.

It cannot reliably detect:
- a poisoned DNS answer that keeps the same hostname;
- a malicious IP returned for an otherwise allowed hostname;
- arbitrary network-layer tampering below Chromium's URL/request layer.

Secure DNS / DNS-over-HTTPS therefore remains a browser or operating-system setting, not a Jammer replacement.

## Privacy

The phishing snapshot and all third-party network lists are fetched only by build scripts.

The installed extension:
- does not query a remote phishing API;
- does not submit visited domains;
- does not upload navigation history;
- does not log blocked phishing navigation to a Jammer backend.

## Version

Jammer product version:

`0.9.0`
