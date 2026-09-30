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
