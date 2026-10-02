# P4.2 Bilingual UI and popup controls

P4.2 improves everyday usability without expanding Jammer's permission surface.

## Languages

Jammer now supports:

- Auto — follows the browser UI language
- 中文
- English

The selected language is stored only in Jammer's local extension storage.

No network request is used for translation or language detection.

## Popup

The popup now exposes:

- global Protection
- Page ad cleanup
- language selector
- Options button

This means the user no longer needs to open Options just to enable or disable cosmetic ad cleanup.

## Page ad cleanup permission behavior

Turning Page ad cleanup ON from the popup:

1. requests the same optional `scripting` + HTTP/HTTPS site access used by P4.1
2. records `cosmeticEnabled=true`
3. registers the packaged CSS-only cosmetic content script

Turning it OFF from the popup:

1. unregisters the cosmetic CSS
2. records `cosmeticEnabled=false`
3. removes the optional scripting/site-access permission

The Options-page toggle uses the same stored state, so both control surfaces remain synchronized.

## Permission boundary

No new permissions are introduced in P4.2.

Required:
- declarativeNetRequest
- storage

Optional:
- scripting
- http://*/*
- https://*/*

Still absent:
- tabs
- history
- cookies
- webRequest
- background worker
- remote translation service
- telemetry

## Product identity

Product build version:

`0.4.0`

Popup build marker:

`Build: p42-bilingual-product`
