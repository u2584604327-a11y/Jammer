# Security

Jammer is a browser filtering project. Security-sensitive changes include permission expansion, rule-source changes, remote update mechanisms, content scripts, and code that can observe browsing data.

## Development rules

- No secrets in the repository.
- No telemetry by default.
- No remote executable code.
- No unreviewed remote rule source.
- Permission expansion requires an isolated security review.
- Production code must not log browsing contents, credentials, cookies, or form values.

During early development, report security concerns privately to the repository owner rather than publishing exploit details in a public issue.
