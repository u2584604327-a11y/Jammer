# P3.3 requestDomains runtime fixture

This is an **isolated validation extension**, not the Jammer product extension.

Purpose: verify that Edge/Chrome accepts and enforces a realistic `requestDomains` array size before Jammer considers shipping batched EasyList-derived rules.

## Fixture shape

- Manifest V3
- permission: `declarativeNetRequest` only
- one enabled static ruleset
- one block rule
- `requestDomains` entries: 204
- includes `example.com`
- remaining entries use reserved `.invalid` domains

The 204-entry size matches the largest bucket observed in the P3.1 EasyList projection using 256 hash buckets.

## Build

No build step is required for this isolated fixture.

Load this directory directly as an unpacked extension:

```text
fixtures/p33-requestdomains/
```

Do **not** select Jammer's normal `dist/` directory for this test.

## Runtime test

1. Confirm `https://example.com/` loads normally before installing the fixture.
2. Open `edge://extensions` or `chrome://extensions`.
3. Enable Developer mode.
4. Choose **Load unpacked**.
5. Select `fixtures/p33-requestdomains/`.
6. Confirm the fixture extension loads without a ruleset error.
7. Open `https://example.com/`.

Expected while fixture is enabled:

```text
example.com is blocked by the browser extension / ERR_BLOCKED_BY_CLIENT
```

8. Disable or remove the fixture extension.
9. Reload `https://example.com/`.

Expected:

```text
example.com loads normally
```

## Acceptance record

```text
BROWSER_NAME=
BROWSER_VERSION=
FIXTURE_LOAD=
RULESET_ERROR=
REQUESTDOMAINS_COUNT=204
EXAMPLE_COM_BEFORE=
EXAMPLE_COM_WITH_FIXTURE=
EXAMPLE_COM_AFTER_DISABLE=
PERMISSIONS_RUNTIME=
BLOCKED=
```

## Security

The fixture:
- does not use host permissions
- does not use content scripts
- does not use background/service workers
- does not use webRequest
- does not make network requests of its own
- is not copied into Jammer's production `dist/`
- must not be published as a standalone extension

P3.3 remains blocked until a real Edge/Chrome runtime test passes.
