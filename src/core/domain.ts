const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function normalizeDomain(input: string): string {
  const value = input.trim();
  if (!value) throw new Error("Enter a domain.");

  let url: URL;
  try {
    url = new URL(value.includes("://") ? value : `https://${value}`);
  } catch {
    throw new Error("Enter a valid domain.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http/https domains are supported.");
  }
  if (url.username || url.password) {
    throw new Error("Credentials are not allowed in allowlist entries.");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || hostname.length > 253 || !hostname.includes(".")) {
    throw new Error("Enter a fully qualified domain.");
  }

  const labels = hostname.split(".");
  if (labels.some((label) => !LABEL_RE.test(label))) {
    throw new Error("Enter a valid domain.");
  }

  return hostname;
}

export function normalizeDomainList(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const domain = normalizeDomain(value);
    if (!seen.has(domain)) {
      seen.add(domain);
      result.push(domain);
    }
  }
  return result;
}
