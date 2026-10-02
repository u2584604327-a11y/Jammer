const JAMMER_AD_HIDDEN_ATTR = "data-jammer-ad-hidden";
const JAMMER_AD_SCAN_SELECTOR = [
  "ins",
  "iframe",
  "img",
  "a",
  "aside",
  "[data-ad]",
  "[data-ad-slot]",
  "[data-ad-unit]",
  "[data-ad-container]",
  "[aria-label]",
  "[title]",
  "[class]",
  "[id]"
].join(",");

const JAMMER_AD_BATCH_SIZE = 120;
const JAMMER_AD_PENDING_ROOT_LIMIT = 100;

const jammerAdPendingRoots = new Set<ParentNode>();
let jammerAdScanQueued = false;
let jammerAdScanRunning = false;
let jammerAdObserver: MutationObserver | undefined;
let jammerAdDelayedTimers: number[] = [];

const JAMMER_AD_MARKER_RE =
  /(?:^|[\s_\-])(ad|ads|advert|advertisement|advertising|sponsor|sponsored|promo|promotion|banner|commercial)(?:$|[\s_\-])/i;

const JAMMER_AD_PROVIDER_RE =
  /(doubleclick|googlesyndication|googleadservices|adservice|adsystem|adnxs|taboola|outbrain|criteo|pubmatic|rubiconproject|openx|smartadserver|yieldmo|zedo|adsrvr|adform|mgid|revcontent)/i;

const JAMMER_AD_LABEL_RE =
  /(^|[\s:：])(广告|推广|赞助|advertisement|advertising|sponsored|promoted)([\s:：]|$)/i;

const JAMMER_PROMO_SIGNAL_RE =
  /(送彩金|高爆率|爆奖|返水|棋牌|娱乐城|真人娱乐|注册送彩金|首存|彩金|casino|betting|sportsbook|jackpot|free spins|deposit bonus)/i;

const JAMMER_STANDARD_AD_SIZES: Array<[number, number]> = [
  [300, 250],
  [336, 280],
  [728, 90],
  [970, 90],
  [970, 250],
  [468, 60],
  [320, 50],
  [320, 100],
  [300, 600],
  [160, 600],
  [120, 600],
  [250, 250],
  [200, 200]
];

function jammerAdNormalizeSignal(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4_000);
}

function jammerAdUrlSignal(raw: string | null | undefined): string {
  if (!raw) return "";
  try {
    const parsed = new URL(raw, location.href);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return "";
  }
}

function jammerAdElementSignals(element: HTMLElement): string {
  const parts = [
    element.id,
    element.className,
    element.getAttribute("aria-label"),
    element.getAttribute("title"),
    element.getAttribute("role"),
    element.getAttribute("data-ad"),
    element.getAttribute("data-ad-slot"),
    element.getAttribute("data-ad-unit"),
    element.getAttribute("data-ad-container")
  ];

  if (element instanceof HTMLImageElement) {
    parts.push(element.alt, jammerAdUrlSignal(element.src));
  } else if (element instanceof HTMLAnchorElement) {
    parts.push(jammerAdUrlSignal(element.href));
  } else if (element instanceof HTMLIFrameElement) {
    parts.push(jammerAdUrlSignal(element.src));
  }

  const nestedMedia = element.querySelector<HTMLImageElement | HTMLIFrameElement>("img,iframe");
  if (nestedMedia instanceof HTMLImageElement) {
    parts.push(nestedMedia.alt, jammerAdUrlSignal(nestedMedia.src));
  } else if (nestedMedia instanceof HTMLIFrameElement) {
    parts.push(jammerAdUrlSignal(nestedMedia.src));
  }

  const nestedAnchor = element.querySelector<HTMLAnchorElement>("a[href]");
  if (nestedAnchor) parts.push(jammerAdUrlSignal(nestedAnchor.href));

  return jammerAdNormalizeSignal(parts.filter(Boolean).join(" "));
}

function jammerAdGetMedia(element: HTMLElement): HTMLImageElement | HTMLIFrameElement | HTMLElement {
  if (element instanceof HTMLImageElement || element instanceof HTMLIFrameElement) return element;
  return element.querySelector<HTMLImageElement | HTMLIFrameElement>("img,iframe") ?? element;
}

function jammerAdDimensions(element: HTMLElement): { width: number; height: number } {
  const media = jammerAdGetMedia(element);
  const rect = media.getBoundingClientRect();

  let width = rect.width;
  let height = rect.height;

  if (media instanceof HTMLImageElement) {
    if (width <= 1 && media.naturalWidth > 0) width = media.naturalWidth;
    if (height <= 1 && media.naturalHeight > 0) height = media.naturalHeight;
  }

  const attrWidth = Number(media.getAttribute("width"));
  const attrHeight = Number(media.getAttribute("height"));
  if (width <= 1 && Number.isFinite(attrWidth) && attrWidth > 0) width = attrWidth;
  if (height <= 1 && Number.isFinite(attrHeight) && attrHeight > 0) height = attrHeight;

  return { width, height };
}

function jammerAdMatchesStandardSize(width: number, height: number): boolean {
  return JAMMER_STANDARD_AD_SIZES.some(([expectedWidth, expectedHeight]) => {
    const widthTolerance = Math.max(12, expectedWidth * 0.08);
    const heightTolerance = Math.max(8, expectedHeight * 0.12);
    return (
      Math.abs(width - expectedWidth) <= widthTolerance &&
      Math.abs(height - expectedHeight) <= heightTolerance
    );
  });
}

function jammerAdIsWideBanner(width: number, height: number): boolean {
  if (width < 360 || height < 32 || height > 260) return false;
  return width / Math.max(1, height) >= 3.2;
}

function jammerAdIsCrossOriginLink(element: HTMLElement): boolean {
  const anchor =
    element instanceof HTMLAnchorElement
      ? element
      : element.closest<HTMLAnchorElement>("a[href]") ??
        element.querySelector<HTMLAnchorElement>("a[href]");

  if (!anchor?.href) return false;

  try {
    const target = new URL(anchor.href, location.href);
    return (
      (target.protocol === "http:" || target.protocol === "https:") &&
      target.hostname !== location.hostname
    );
  } catch {
    return false;
  }
}

function jammerAdStrongDataMarker(element: HTMLElement): boolean {
  return (
    element.hasAttribute("data-ad") ||
    element.hasAttribute("data-ad-slot") ||
    element.hasAttribute("data-ad-unit") ||
    element.getAttribute("data-ad-container") === "true" ||
    element.matches("ins.adsbygoogle")
  );
}

function jammerAdScore(element: HTMLElement): number {
  const signal = jammerAdElementSignals(element);
  const { width, height } = jammerAdDimensions(element);
  const crossOrigin = jammerAdIsCrossOriginLink(element);
  const standardSize = jammerAdMatchesStandardSize(width, height);
  const wideBanner = jammerAdIsWideBanner(width, height);

  let score = 0;

  if (jammerAdStrongDataMarker(element)) score += 7;
  if (JAMMER_AD_PROVIDER_RE.test(signal)) score += 7;
  if (JAMMER_AD_LABEL_RE.test(signal)) score += 5;
  if (JAMMER_AD_MARKER_RE.test(signal)) score += 5;
  if (JAMMER_PROMO_SIGNAL_RE.test(signal)) score += 3;
  if (standardSize) score += 2;
  if (wideBanner) score += 2;
  if (crossOrigin) score += 1;
  if ((element instanceof HTMLIFrameElement || element.querySelector("iframe")) && crossOrigin) {
    score += 1;
  }

  // A wide, linked, cross-origin image is a common self-hosted banner-ad shape.
  if (wideBanner && crossOrigin && (element instanceof HTMLImageElement || element.querySelector("img"))) {
    score += 2;
  }

  return score;
}

function jammerAdChooseTarget(element: HTMLElement): HTMLElement {
  if (element instanceof HTMLImageElement) {
    const anchor = element.closest<HTMLAnchorElement>("a[href]");
    if (anchor && anchor.children.length <= 4) return anchor;
  }

  if (element instanceof HTMLIFrameElement || element instanceof HTMLAnchorElement) {
    return element;
  }

  return element;
}

function jammerAdEligible(element: HTMLElement): boolean {
  if (!element.isConnected) return false;
  if (element.hasAttribute(JAMMER_AD_HIDDEN_ATTR)) return false;
  if (element.closest(`[${JAMMER_AD_HIDDEN_ATTR}="true"]`)) return false;
  if (element.matches("html,body,main,form,input,textarea,button,select,option")) return false;

  const style = getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") return false;

  const { width, height } = jammerAdDimensions(element);
  if (width <= 1 || height <= 1) {
    const signal = jammerAdElementSignals(element);
    return jammerAdStrongDataMarker(element) || JAMMER_AD_PROVIDER_RE.test(signal);
  }

  return true;
}

function jammerAdHide(element: HTMLElement): void {
  const target = jammerAdChooseTarget(element);
  if (!jammerAdEligible(target)) return;

  target.setAttribute(JAMMER_AD_HIDDEN_ATTR, "true");
  target.dataset.jammerAdOriginalDisplay = target.style.getPropertyValue("display");
  target.dataset.jammerAdOriginalDisplayPriority = target.style.getPropertyPriority("display");
  target.style.setProperty("display", "none", "important");
}

function jammerAdCollect(root: ParentNode): HTMLElement[] {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(JAMMER_AD_SCAN_SELECTOR));
  if (root instanceof HTMLElement && root.matches(JAMMER_AD_SCAN_SELECTOR)) nodes.push(root);
  return Array.from(new Set(nodes));
}

async function jammerAdScan(root: ParentNode): Promise<void> {
  const candidates = jammerAdCollect(root);

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (jammerAdEligible(candidate) && jammerAdScore(candidate) >= 5) {
      jammerAdHide(candidate);
    }

    if ((index + 1) % JAMMER_AD_BATCH_SIZE === 0) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    }
  }
}

async function jammerAdDrain(): Promise<void> {
  if (jammerAdScanRunning) return;
  jammerAdScanRunning = true;

  try {
    while (jammerAdPendingRoots.size > 0) {
      const roots = Array.from(jammerAdPendingRoots);
      jammerAdPendingRoots.clear();
      for (const root of roots) await jammerAdScan(root);
    }
  } finally {
    jammerAdScanRunning = false;
  }
}

function jammerAdQueue(root: ParentNode = document): void {
  if (jammerAdPendingRoots.size >= JAMMER_AD_PENDING_ROOT_LIMIT) {
    jammerAdPendingRoots.clear();
    jammerAdPendingRoots.add(document);
  } else {
    jammerAdPendingRoots.add(root);
  }

  if (jammerAdScanQueued) return;
  jammerAdScanQueued = true;

  window.setTimeout(() => {
    jammerAdScanQueued = false;
    void jammerAdDrain().catch(() => undefined);
  }, 100);
}

function jammerAdStart(): void {
  jammerAdQueue(document);

  for (const timer of jammerAdDelayedTimers) clearTimeout(timer);
  jammerAdDelayedTimers = [500, 1500, 3500, 7000].map((delay) =>
    window.setTimeout(() => jammerAdQueue(document), delay)
  );

  jammerAdObserver?.disconnect();
  jammerAdObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.target instanceof HTMLElement) {
        jammerAdQueue(mutation.target);
        continue;
      }

      if (mutation.type !== "childList") continue;
      for (const added of Array.from(mutation.addedNodes)) {
        if (added instanceof HTMLElement) jammerAdQueue(added);
      }
    }
  });

  if (document.documentElement) {
    jammerAdObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "class",
        "id",
        "src",
        "href",
        "style",
        "aria-label",
        "title",
        "data-ad",
        "data-ad-slot",
        "data-ad-unit",
        "data-ad-container"
      ]
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", jammerAdStart, { once: true });
} else {
  jammerAdStart();
}
