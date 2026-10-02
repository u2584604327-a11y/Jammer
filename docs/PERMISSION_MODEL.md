# Permission Model

## P1 policy

Jammer uses Manifest V3 and starts from the smallest permission set that can implement network blocking.

Preferred P1 permissions:

- `declarativeNetRequest`
- `storage` only if settings cannot be kept without it

P1 must not request:

- `webRequest`
- `webRequestBlocking`
- `tabs`
- `cookies`
- `history`
- `downloads`
- `debugger`
- `scripting`
- `<all_urls>` host access
- content scripts
- native messaging

## Rationale

Declarative Net Request lets the browser apply blocking rules without the extension intercepting each request and viewing its contents. This is preferred over request interception.

## Permission expansion gate

Any new permission requires a dedicated PR section documenting:

1. Feature requiring it.
2. Why an existing lower-privilege mechanism is insufficient.
3. Exact data newly exposed.
4. Whether permission can be optional or per-site.
5. Runtime tests proving the feature.
6. Updated threat model.

Permission expansion must not be bundled into unrelated work.

## Future content filtering

If a later phase needs page DOM access, it must be optional and separately reviewed. Prefer per-site or user-triggered access over unconditional global access.


## P6.0 content-filter permission review

Feature:
- opt-in local content-category warnings.

Why lower privilege is insufficient:
- `declarativeNetRequest` can classify network requests but cannot read rendered page text;
- page-text classification requires a content script in the page.

Exact additional exposure:
- while enabled, Jammer can execute its packaged content-filter scripts on HTTP/HTTPS pages;
- those scripts can inspect page DOM text visible to the page context.

Mitigations:
- the permission remains optional;
- categories are disabled by default;
- content filtering is disabled by default;
- content scripts are registered only after explicit user activation;
- a separate content-filter exception list is supported;
- page text is processed locally;
- no remote classifier or telemetry is used;
- optional site access is removed when neither content filtering nor cosmetic filtering needs it.

The required manifest permission set remains:

`declarativeNetRequest`
`storage`

Optional:

`scripting`
`http://*/*`
`https://*/*`


## P6.4 phishing and HTTPS-navigation permission review

Known-phishing blocking uses packaged `declarativeNetRequest` rules and requires no permission expansion.

The optional HTTPS-navigation upgrade uses the already-declared optional HTTP/HTTPS host permissions:

- `http://*/*`
- `https://*/*`

It does not require `scripting`.

Why host access is requested:
- the feature installs a dynamic DNR `upgradeScheme` rule for top-level and embedded HTTP navigation;
- Jammer only activates this rule after the user explicitly enables the feature and grants site access.

Scope:
- `main_frame`
- `sub_frame`
- URL pattern beginning with `http://`

It does not inspect request bodies, DNS answers, cookies, history, or page contents.

Permission cleanup:
- if page cleanup/content filtering are off, `scripting` is removed even when HTTPS upgrade still needs host access;
- HTTP/HTTPS host access is removed when page cleanup, content filtering, and HTTPS upgrade all stop needing it.

No P6.4 permission adds:
- `tabs`
- `history`
- `cookies`
- `webRequest`
- `webRequestBlocking`
- `debugger`
- `nativeMessaging`
