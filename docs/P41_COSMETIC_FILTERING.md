# P4.1 Opt-in cosmetic ad filtering

P4.1 handles the "page-internal" ad case: visible ad containers or empty ad placeholders that remain after network requests have already been blocked.

## Design

P4.1 deliberately avoids page-reading JavaScript.

It registers a **CSS-only** content script:

```text
cosmetic.css
```

The CSS hides conservative explicit ad markers such as:

- `ins.adsbygoogle`
- Google ad iframe/container IDs
- `data-ad-slot`
- `data-ad-unit`
- explicit `advertisement` / `ad-slot` / `ad-container` classes
- explicit Advertisement complementary regions

No JavaScript is injected into the web page.

## Permission model

Base Jammer permissions remain:

- `declarativeNetRequest`
- `storage`

Cosmetic filtering declares only optional capabilities:

```json
{
  "optional_permissions": ["scripting"],
  "optional_host_permissions": [
    "http://*/*",
    "https://*/*"
  ]
}
```

The user must explicitly enable **Page ad cleanup** in Options.

At that moment Edge/Chrome displays the site-access permission prompt.

If permission is denied, cosmetic filtering remains disabled.

When the user disables Page ad cleanup:

- the registered CSS content script is removed
- the optional scripting/host permissions are removed

## Global Protection

The main Protection switch controls both layers:

```text
Protection ON
  -> network DNR enabled when Ads is enabled
  -> cosmetic CSS registered when Page ad cleanup is enabled and permission exists

Protection OFF
  -> network DNR disabled
  -> cosmetic CSS unregistered
```

Turning Protection back on restores cosmetic CSS if the user previously enabled Page ad cleanup and the optional permission is still granted.

## Allowlist

Allowlisted domains are excluded from cosmetic injection.

For `example.com`, Jammer registers exclusions for:

```text
*://example.com/*
*://*.example.com/*
```

This keeps the allowlist consistent across network and page-visual blocking.

## Privacy boundary

P4.1 does not:

- read page text
- inspect form fields
- inspect passwords
- inspect search queries
- collect page URLs
- send page data anywhere
- run a semantic classifier
- add a background worker
- add a static `<all_urls>` host permission

The optional site access is used only so Chrome can inject the packaged `cosmetic.css` resource.

## Known limitations

CSS-only filtering will not remove every first-party or obfuscated ad.

Aggressive element classification, text-based "Sponsored" detection, and DOM mutation logic are intentionally deferred because they expand false-positive and privacy risk.

P4.1 should first be validated on representative pages before selector coverage is expanded.
