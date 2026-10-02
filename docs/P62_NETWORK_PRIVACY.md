# P6.2 Network privacy and navigation protection

P6.2 adds two network-layer protections without adding broad interception permissions.

## 1. Privacy / tracker blocking

Jammer now packages a second static DNR ruleset:

`privacy_static`

The product build compiles a pinned EasyPrivacy tracking-server source at build time.

Pinned source:
- repository: `easylist/easylist`
- commit: `3f284f851f6380a25c0f7e2447f2b01b1c8ee2d8`
- path: `easyprivacy/easyprivacy_trackingservers_general.txt`
- expected Git blob SHA-1: `1b597e69051308fc4a4ed57a023df6ec33b61161`
- accepted domains: 534
- emitted DNR rules: 64
- runtime remote update: no

The privacy rules target resource requests such as:
- scripts
- images / tracking pixels
- XMLHttpRequest
- pings
- subframes
- WebSocket and other supporting resource types

They intentionally do not block `main_frame` navigation merely because a domain appears in the tracker source.

The user can independently enable or disable Privacy / tracker blocking.

## 2. Dangerous-site block list

Options now includes a local user-managed domain block list.

Each listed domain becomes a high-priority dynamic DNR block rule for:
- `main_frame`
- `sub_frame`

This means redirects or clicks that navigate to a listed domain are blocked before the destination page loads.

The list is local browser-extension storage and is not uploaded.

## DNS boundary

Jammer does not directly control or inspect DNS resolution.

It can block requests based on the URL/domain visible to Chromium. It can therefore stop a redirect to a listed bad domain.

It cannot reliably detect a DNS poisoning event where an allowed hostname is resolved to an attacker-controlled IP while the hostname itself remains unchanged. Secure DNS / DNS-over-HTTPS and browser reputation protection remain separate layers.

## Script/data-reading boundary

Blocking EasyPrivacy tracker endpoints prevents many known third-party tracking scripts and data-collection requests from loading or sending data.

Jammer does not attempt to disable arbitrary first-party JavaScript merely because it can read page DOM. Doing so would break normal sites and would require a much broader security model.

P6.2 does not request:
- `tabs`
- `history`
- `cookies`
- `webRequest`
- `webRequestBlocking`
- `debugger`
- `nativeMessaging`

## Version

Jammer product version:

`0.8.0`
