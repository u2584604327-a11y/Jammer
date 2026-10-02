# P4.3 EasyList cosmetic filtering

P4.1 proved the permission and CSS-injection path but used only a small conservative selector set.

Real sites can self-host ad markup that does not match those selectors. The Can You Block It testing page is one example: the site explicitly describes its test ads as self-hosted.

P4.3 adds build-time cosmetic filtering from the same pinned EasyList commit already used for network blocking.

## Pinned sources

Commit:

`3f284f851f6380a25c0f7e2447f2b01b1c8ee2d8`

Generic cosmetic source:

`easylist/easylist_general_hide.txt`

Reviewed baseline:

- bytes: 236,792
- Git blob SHA-1: `f2751049c9f5db7a5afe169f5f3f9824e33fd496`
- generic selectors: 13,631

Site-specific source:

`easylist/easylist_specific_hide.txt`

Reviewed baseline:

- bytes: 437,250
- Git blob SHA-1: `49e3937b6ca2cce86da30bb5a47162f3af7d042b`

## Runtime model

When Page ad cleanup is enabled, Jammer registers two CSS-only layers:

1. Global layer
   - repository-owned conservative `cosmetic.css`
   - generated `cosmetic-easylist.css` with 13,631 generic EasyList selectors

2. CanYouBlockIt regression layer
   - only matches `canyoublockit.com` and subdomains
   - generated from the pinned EasyList site-specific rule(s) for that domain

No page JavaScript is injected.

## Build trust

The build downloads only exact pinned raw files, verifies byte size and Git blob SHA-1, then compiles CSS locally.

The extension does not download cosmetic lists at runtime.

## Privacy and permissions

No additional permission beyond P4.1/P4.2.

Required:
- declarativeNetRequest
- storage

Optional:
- scripting
- http://*/*
- https://*/*

No:
- page-text scanning
- form/password access
- tabs/history/cookies
- telemetry
- runtime filter update

## Scope

P4.3 deliberately supports:

- all EasyList generic CSS cosmetic selectors
- one pinned site-specific regression target: canyoublockit.com

A future phase can compile the full site-specific EasyList corpus efficiently. P4.3 does not pretend that one site-specific rule equals complete site-specific EasyList support.
