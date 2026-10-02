# Jammer Store Listing — English

## Product name

Jammer

## Short description

Local-first ad/script and tracker blocking with known-phishing navigation protection, optional HTTPS upgrade, page cleanup, and selective content masking.

## Long description

Jammer is a local-first Manifest V3 browser extension for blocking network advertising, hiding clearly identified page ad containers, and optionally hiding only matched content blocks from user-selected categories while keeping control in the user's hands.

Network blocking uses Chromium's declarativeNetRequest engine with EasyList-derived rules that are pinned, verified, and compiled at build time. Jammer does not download filter lists at runtime.

Page ad cleanup is optional. When enabled, Jammer requests website access and applies packaged cosmetic CSS plus local element heuristics for self-hosted and dynamically inserted ads. The permission is removed again when the feature is disabled. Jammer does not use that capability to read page text, forms, passwords, browsing history, or cookies.

Jammer includes:
- network ad blocking
- packaged privacy / tracker blocking
- packaged known-phishing navigation blocking
- optional HTTP-to-HTTPS navigation upgrade
- local manual dangerous-domain blocking
- optional page ad cleanup
- opt-in local content masking for gambling/betting promotion, explicit sexual material, graphic violence, scam-like promotion, and clickbait/nuisance content
- explainable category and matched-signal placeholders with reveal and leave-page controls
- separate local content-filter exceptions
- local allowlist management
- Auto / 中文 / English interface language
- reversible site-access permission
- local-only settings
- no telemetry
- no analytics
- no account system
- no cloud sync
- no remote code or runtime filter download

Required permissions are limited to declarativeNetRequest and storage. Page ad cleanup/content filtering use optional scripting and HTTP/HTTPS site access only after explicit activation; HTTPS navigation upgrade uses optional HTTP/HTTPS site access without requiring scripting. Content filtering processes limited visible page text locally and does not upload it to a Jammer server.

Jammer is designed around explicit controls, auditable filter provenance, and browser-native enforcement.

## Privacy summary

Jammer stores settings locally in browser extension storage. It does not operate an account service, analytics service, telemetry endpoint, cloud synchronization service, or remote filter-update service.

Optional website access is used for explicitly enabled page cleanup/content filtering or HTTPS navigation upgrade. It is not used for browsing-history collection.

## Suggested search terms

ad blocker
ad blocking
privacy
local
EasyList
cosmetic filtering
