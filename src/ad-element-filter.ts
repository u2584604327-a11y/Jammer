type JammerAdCategoryDomains = {
  gambling?: string[];
  explicit?: string[];
};

const JAMMER_AD_HEURISTIC_HIDDEN = "data-jammer-ad-heuristic-hidden";
const JAMMER_AD_MARKER_RE = /(?:^|[-_\s])(ads?|adslot|adunit|advert(?:isement|ising)?|sponsor(?:ed)?|promo(?:tion)?|banner|popunder|popup|affiliate)(?:$|[-_\s])/i;
const JAMMER_AD_URL_RE = /(?:\/|[?&_.-])(ads?|advert|banner|promo|sponsor|affiliate|popunder|popup)(?:\/|[?&=_.-]|$)/i;

let jammerAdHeuristicQueued = false;
let jammerAdHeuristicObserver: MutationObserver | undefined;

function jammerAdCategoryDomains(): JammerAdCategoryDomains {
  return (globalThis as unknown as {
    JammerContentCategoryDomains?: JammerAdCategoryDomains;
  }).JammerContentCategoryDomains ?? {};
}

function jammerAdBinarySearch(values: string[], target: string): boolean {
  let low = 0;
  let high = values.length - 1;

  while (low <= high) {
    const middle = (low + high) >>> 1;
    const value = values[middle];
    if (value === target) return true;
    if (value < target) low = middle + 1;
    else high = middle - 1;
  }

  return false;
}

function jammerAdDomainListed(hostname: string): boolean {
  const normalized = hostname.toLocaleLowerCase().replace(/\.$/, "");
  const labels = normalized.split(".").filter(Boolean);
  const map = jammerAdCategoryDomains();

  for (let index = 0; index <= labels.length - 2; index += 1) {
    const suffix = labels.slice(index).join(".");
    if (
      jammerAdBinarySearch(map.gambling ?? [], suffix) ||
      jammerAdBinarySearch(map.explicit ?? [], suffix)
    ) {
      return true;
    }
  }

  return false;
}

function jammerAdUrl(raw: string | null): URL | null {
  if (!raw) return null;
  try {
    const url = new URL(raw, location.href);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function jammerAdMarkerText(element: HTMLElement): string {
  const values = [
    element.id,
    element.className,
    element.getAttribute("aria-label"),
    element.getAttribute("title"),
    element.getAttribute("data-ad"),
    element.getAttribute("data-ad-slot"),
    element.getAttribute("data-ad-unit"),
    element.getAttribute("data-testid")
  ];

  return values
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .slice(0, 2_000);
}

function jammerAdImageDimensions(image: HTMLImageElement): {
  width: number;
  height: number;
  aspect: number;
} {
  const rect = image.getBoundingClientRect();
  const width = rect.width || image.width || image.naturalWidth || 0;
  const height = rect.height || image.height || image.naturalHeight || 0;
  return {
    width,
    height,
    aspect: height > 0 ? width / height : 0
  };
}

function jammerAdDenseBannerStrip(anchor: HTMLAnchorElement): boolean {
  const parent = anchor.parentElement;
  if (!parent) return false;

  const linkedImages = Array.from(parent.querySelectorAll<HTMLAnchorElement>("a[href]"))
    .map((item) => ({ anchor: item, image: item.querySelector<HTMLImageElement>("img") }))
    .filter((item): item is { anchor: HTMLAnchorElement; image: HTMLImageElement } => Boolean(item.image))
    .slice(0, 20);

  if (linkedImages.length < 3) return false;

  let compactBannerCount = 0;
  let externalDestinationCount = 0;

  for (const item of linkedImages) {
    const dimensions = jammerAdImageDimensions(item.image);
    if (
      dimensions.width >= 70 &&
      dimensions.height >= 18 &&
      dimensions.height <= 180 &&
      dimensions.aspect >= 1.8
    ) {
      compactBannerCount += 1;
    }

    const href = jammerAdUrl(item.anchor.getAttribute("href"));
    if (
      href &&
      href.hostname !== location.hostname &&
      !href.hostname.endsWith("." + location.hostname)
    ) {
      externalDestinationCount += 1;
    }
  }

  return compactBannerCount >= 3 && externalDestinationCount >= 2;
}

function jammerAdCandidateScore(anchor: HTMLAnchorElement): number {
  if (!anchor.isConnected) return 0;
  if (anchor.closest("nav,header,footer,[role='navigation'],[role='banner'],[role='contentinfo']")) {
    return 0;
  }

  const image = anchor.querySelector<HTMLImageElement>("img");
  if (!image) return 0;

  const marker = [
    jammerAdMarkerText(anchor),
    jammerAdMarkerText(image),
    jammerAdMarkerText(anchor.parentElement ?? anchor)
  ].join(" ");

  const href = jammerAdUrl(anchor.getAttribute("href"));
  const src = jammerAdUrl(
    image.getAttribute("src") ??
    image.getAttribute("data-src") ??
    image.getAttribute("data-original")
  );

  let score = 0;

  if (JAMMER_AD_MARKER_RE.test(marker)) score += 4;
  if (href && JAMMER_AD_URL_RE.test(href.href)) score += 3;
  if (src && JAMMER_AD_URL_RE.test(src.href)) score += 3;

  if (href && jammerAdDomainListed(href.hostname)) score += 5;
  if (src && jammerAdDomainListed(src.hostname)) score += 4;

  const dimensions = jammerAdImageDimensions(image);
  const wideBanner =
    dimensions.width >= 120 &&
    dimensions.height >= 18 &&
    dimensions.height <= 280 &&
    dimensions.aspect >= 2.2;

  if (wideBanner) score += 1;

  if (
    href &&
    href.hostname !== location.hostname &&
    !href.hostname.endsWith("." + location.hostname)
  ) {
    score += wideBanner ? 2 : 1;
  }

  if (
    src &&
    src.hostname !== location.hostname &&
    !src.hostname.endsWith("." + location.hostname)
  ) {
    score += wideBanner ? 1 : 0;
  }

  if (jammerAdDenseBannerStrip(anchor)) score += 2;

  return score;
}

function jammerAdTarget(anchor: HTMLAnchorElement): HTMLElement {
  return (
    anchor.closest<HTMLElement>(
      "[data-ad],[data-ad-slot],[data-ad-unit],[class*='advert' i],[class*='sponsor' i],[class*='banner' i],[class*='promo' i],li,figure"
    ) ??
    anchor
  );
}

function jammerAdHide(element: HTMLElement): void {
  if (element.hasAttribute(JAMMER_AD_HEURISTIC_HIDDEN)) return;
  element.setAttribute(JAMMER_AD_HEURISTIC_HIDDEN, "true");
  element.style.setProperty("display", "none", "important");
  element.style.setProperty("visibility", "hidden", "important");
}

function jammerAdScan(root: ParentNode = document): void {
  const anchors: HTMLAnchorElement[] = [];
  if (root instanceof HTMLAnchorElement) anchors.push(root);
  anchors.push(...Array.from(root.querySelectorAll<HTMLAnchorElement>("a[href]")));

  for (const anchor of anchors.slice(0, 600)) {
    if (jammerAdCandidateScore(anchor) < 5) continue;
    jammerAdHide(jammerAdTarget(anchor));
  }
}

function jammerAdQueueScan(root: ParentNode = document): void {
  if (jammerAdHeuristicQueued) return;
  jammerAdHeuristicQueued = true;

  window.setTimeout(() => {
    jammerAdHeuristicQueued = false;
    jammerAdScan(root);
  }, 140);
}

function jammerAdStart(): void {
  jammerAdScan(document);

  for (const delay of [700, 1800, 4000]) {
    window.setTimeout(() => jammerAdScan(document), delay);
  }

  jammerAdHeuristicObserver?.disconnect();
  jammerAdHeuristicObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.target instanceof HTMLElement) {
        jammerAdQueueScan(mutation.target);
        return;
      }

      for (const added of Array.from(mutation.addedNodes)) {
        if (!(added instanceof HTMLElement)) continue;
        jammerAdQueueScan(added);
        return;
      }
    }
  });

  if (document.documentElement) {
    jammerAdHeuristicObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href", "src", "data-src", "data-original", "class", "id", "aria-label", "title"]
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", jammerAdStart, { once: true });
} else {
  jammerAdStart();
}
