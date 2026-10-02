# Rule source registry

This directory contains source metadata and small repository-owned fixtures used to test the P2 compiler.

Large third-party filter lists must not be added merely because they are technically compatible. Before adding one:

1. Review license and redistribution terms.
2. Record canonical source and homepage.
3. Pin or record an upstream version/date/hash.
4. Run the compiler and inspect the rejection report.
5. Verify DNR rule-count limits and behavior.
6. Review false-positive and allowlist behavior.
7. Add tests for source-specific syntax assumptions.

P2 performs no runtime list download.
