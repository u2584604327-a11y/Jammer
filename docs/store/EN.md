# Jammer Store Listing — English

## Product name

Jammer

## Short description

Local-first ad blocking with optional page-ad cleanup and opt-in on-device content-category warnings.

## Long description

Jammer is a local-first Manifest V3 browser extension for blocking network advertising, hiding clearly identified page ad containers, and optionally warning on user-selected content categories while keeping control in the user's hands.

Network blocking uses Chromium's declarativeNetRequest engine with EasyList-derived rules that are pinned, verified, and compiled at build time. Jammer does not download filter lists at runtime.

Page ad cleanup is optional. When enabled, Jammer requests website access and injects packaged CSS-only cosmetic filtering. The permission is removed again when the feature is disabled. Jammer does not use that capability to read page text, forms, passwords, browsing history, or cookies.

Jammer includes:
- network ad blocking
- optional page ad cleanup
- opt-in local content warnings for gambling/betting promotion, explicit sexual material, graphic violence, scam-like promotion, and clickbait/nuisance content
- explainable category and matched-signal warnings
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

Required permissions are limited to declarativeNetRequest and storage. Page ad cleanup and content filtering use optional scripting and HTTP/HTTPS site access only after the user enables one of those features. Content filtering processes limited visible page text locally and does not upload it to a Jammer server.

Jammer is designed around explicit controls, auditable filter provenance, and browser-native enforcement.

## Privacy summary

Jammer stores settings locally in browser extension storage. It does not operate an account service, analytics service, telemetry endpoint, cloud synchronization service, or remote filter-update service.

The optional website-access permission is used only to apply packaged CSS-based cosmetic filtering when Page ad cleanup is enabled.

## Suggested search terms

ad blocker
ad blocking
privacy
local
EasyList
cosmetic filtering
