type JammerSpecificCosmeticMap = Record<string, string[]>;

const JAMMER_SPECIFIC_COSMETIC_HIDDEN = "data-jammer-specific-cosmetic-hidden";
const JAMMER_SPECIFIC_COSMETIC_MAX_SELECTORS = 2_000;

let jammerSpecificSelectors: string[] = [];
let jammerSpecificObserver: MutationObserver | undefined;
let jammerSpecificScanQueued = false;

function jammerSpecificCosmeticMap(): JammerSpecificCosmeticMap {
  return (globalThis as unknown as {
    JammerEasyListSpecificCosmetic?: JammerSpecificCosmeticMap;
  }).JammerEasyListSpecificCosmetic ?? {};
}

function jammerSpecificHostnameSuffixes(hostname: string): string[] {
  const normalized = hostname.toLocaleLowerCase().replace(/\.$/, "");
  const labels = normalized.split(".").filter(Boolean);
  const suffixes: string[] = [];

  for (let index = 0; index <= labels.length - 2; index += 1) {
    suffixes.push(labels.slice(index).join("."));
  }

  return suffixes;
}

function jammerSpecificResolveSelectors(): string[] {
  const map = jammerSpecificCosmeticMap();
  const selectors = new Set<string>();

  for (const hostname of jammerSpecificHostnameSuffixes(location.hostname)) {
    for (const selector of map[hostname] ?? []) {
      selectors.add(selector);
      if (selectors.size >= JAMMER_SPECIFIC_COSMETIC_MAX_SELECTORS) {
        return [...selectors];
      }
    }
  }

  return [...selectors];
}

function jammerSpecificHideElement(element: HTMLElement): void {
  if (element.hasAttribute(JAMMER_SPECIFIC_COSMETIC_HIDDEN)) return;
  element.setAttribute(JAMMER_SPECIFIC_COSMETIC_HIDDEN, "true");
  element.style.setProperty("display", "none", "important");
  element.style.setProperty("visibility", "hidden", "important");
}

function jammerSpecificScan(root: ParentNode = document): void {
  if (jammerSpecificSelectors.length === 0) return;

  for (const selector of jammerSpecificSelectors) {
    try {
      if (root instanceof HTMLElement && root.matches(selector)) {
        jammerSpecificHideElement(root);
      }

      for (const node of root.querySelectorAll<HTMLElement>(selector)) {
        jammerSpecificHideElement(node);
      }
    } catch {
      // A browser may reject a selector accepted by upstream syntax.
      // Skip only that selector rather than disabling the complete ruleset.
    }
  }
}

function jammerSpecificQueueScan(root: ParentNode = document): void {
  if (jammerSpecificScanQueued) return;
  jammerSpecificScanQueued = true;

  window.setTimeout(() => {
    jammerSpecificScanQueued = false;
    jammerSpecificScan(root);
  }, 120);
}

function jammerSpecificStart(): void {
  jammerSpecificSelectors = jammerSpecificResolveSelectors();
  if (jammerSpecificSelectors.length === 0) return;

  jammerSpecificScan(document);

  jammerSpecificObserver?.disconnect();
  jammerSpecificObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const added of Array.from(mutation.addedNodes)) {
        if (!(added instanceof HTMLElement)) continue;
        jammerSpecificQueueScan(added);
        return;
      }
    }
  });

  if (document.documentElement) {
    jammerSpecificObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", jammerSpecificStart, { once: true });
} else {
  jammerSpecificStart();
}
