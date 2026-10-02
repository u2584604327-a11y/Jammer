type JammerContentFilterLanguage = "auto" | "zh-CN" | "en";
type JammerContentFilterCategory = "gambling" | "explicit" | "violence" | "scam" | "clickbait";
type JammerContentFilterCategories = Record<JammerContentFilterCategory, boolean>;

type JammerContentFilterSettings = {
  enabled: boolean;
  contentEnabled: boolean;
  language: JammerContentFilterLanguage;
  contentCategories: JammerContentFilterCategories;
  contentAllowlist: string[];
};

const JAMMER_CONTENT_FILTER_STORAGE_KEY = "jammerSettings";
const JAMMER_CONTENT_FILTER_MASK_ATTR = "data-jammer-content-masked";
const JAMMER_CONTENT_FILTER_REVEALED_ATTR = "data-jammer-content-revealed";
const JAMMER_CONTENT_FILTER_ID_ATTR = "data-jammer-content-mask-id";
const JAMMER_CONTENT_FILTER_PLACEHOLDER_ATTR = "data-jammer-content-placeholder";
const JAMMER_CONTENT_FILTER_CANDIDATE_SELECTOR = [
  "article",
  "[role='article']",
  "[role='listitem']",
  "li",
  "section",
  "figure",
  "p",
  "[class*='card' i]",
  "[class*='post' i]",
  "[class*='feed' i]",
  "[class*='story' i]",
  "[class*='result' i]",
  "[class*='entry' i]",
  "[class*='comment' i]",
  "[class*='tile' i]",
  "[class*='item' i]",
  "[class*='recommend' i]",
  "[class*='video' i]",
  "[class*='news' i]",
  "[class*='content' i]"
].join(",");

const JAMMER_CONTENT_FILTER_CONTAINER_SELECTOR = [
  "article",
  "[role='article']",
  "[role='listitem']",
  "li",
  "figure",
  "[class*='card' i]",
  "[class*='post' i]",
  "[class*='feed' i]",
  "[class*='story' i]",
  "[class*='result' i]",
  "[class*='entry' i]",
  "[class*='comment' i]",
  "[class*='tile' i]",
  "[class*='item' i]",
  "[class*='recommend' i]",
  "[class*='video' i]",
  "[class*='news' i]",
  "[class*='content' i]"
].join(",");

const JAMMER_CONTENT_FILTER_DEFAULT_CATEGORIES: JammerContentFilterCategories = {
  gambling: false,
  explicit: false,
  violence: false,
  scam: false,
  clickbait: false
};

let jammerContentObserver: MutationObserver | undefined;
let jammerContentScanQueued = false;
let jammerContentMaskSequence = 0;
let jammerContentDelayedTimers: number[] = [];

function jammerContentFilterSanitizeSettings(value: unknown): JammerContentFilterSettings {
  const candidate = value && typeof value === "object"
    ? value as Partial<JammerContentFilterSettings>
    : {};

  const rawCategories = candidate.contentCategories && typeof candidate.contentCategories === "object"
    ? candidate.contentCategories as Partial<JammerContentFilterCategories>
    : {};

  return {
    enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : true,
    contentEnabled: typeof candidate.contentEnabled === "boolean" ? candidate.contentEnabled : false,
    language:
      candidate.language === "zh-CN" || candidate.language === "en" || candidate.language === "auto"
        ? candidate.language
        : "auto",
    contentCategories: {
      gambling: rawCategories.gambling === true,
      explicit: rawCategories.explicit === true,
      violence: rawCategories.violence === true,
      scam: rawCategories.scam === true,
      clickbait: rawCategories.clickbait === true
    },
    contentAllowlist: Array.isArray(candidate.contentAllowlist)
      ? candidate.contentAllowlist.filter((item): item is string => typeof item === "string")
      : []
  };
}

function jammerContentFilterHostnameAllowed(hostname: string, allowlist: string[]): boolean {
  const normalized = hostname.toLocaleLowerCase().replace(/\.$/, "");
  return allowlist.some((entry) => {
    const allowed = entry.toLocaleLowerCase().replace(/\.$/, "");
    return normalized === allowed || normalized.endsWith("." + allowed);
  });
}

async function jammerContentFilterLoadSettings(): Promise<JammerContentFilterSettings> {
  const stored = await chrome.storage.local.get(JAMMER_CONTENT_FILTER_STORAGE_KEY);
  return jammerContentFilterSanitizeSettings(stored[JAMMER_CONTENT_FILTER_STORAGE_KEY]);
}

async function jammerContentFilterSaveSettings(settings: JammerContentFilterSettings): Promise<void> {
  const stored = await chrome.storage.local.get(JAMMER_CONTENT_FILTER_STORAGE_KEY);
  const existing = stored[JAMMER_CONTENT_FILTER_STORAGE_KEY];
  const merged = existing && typeof existing === "object"
    ? { ...(existing as Record<string, unknown>), ...settings }
    : settings;
  await chrome.storage.local.set({ [JAMMER_CONTENT_FILTER_STORAGE_KEY]: merged });
}

function jammerContentFilterResolvedLanguage(
  preference: JammerContentFilterLanguage
): "zh-CN" | "en" {
  if (preference === "zh-CN" || preference === "en") return preference;
  return navigator.language.toLocaleLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

function jammerContentFilterCategoryLabel(
  category: JammerContentFilterCategory,
  language: "zh-CN" | "en"
): string {
  const labels: Record<JammerContentFilterCategory, { en: string; "zh-CN": string }> = {
    gambling: { en: "Gambling promotion", "zh-CN": "赌博/博彩推广" },
    explicit: { en: "Explicit sexual material", "zh-CN": "露骨色情内容" },
    violence: { en: "Graphic violence", "zh-CN": "血腥/严重暴力内容" },
    scam: { en: "Scam-like promotion", "zh-CN": "疑似诈骗诱导" },
    clickbait: { en: "Clickbait / nuisance", "zh-CN": "标题党/诱导内容" }
  };
  return labels[category][language];
}

function jammerContentFilterClassifier(): {
  classify(
    sample: JammerContentSample,
    enabled: JammerContentCategorySelection
  ): JammerContentMatch[];
} {
  return (globalThis as unknown as {
    JammerContentClassifier: {
      classify(
        sample: JammerContentSample,
        enabled: JammerContentCategorySelection
      ): JammerContentMatch[];
    };
  }).JammerContentClassifier;
}

function jammerContentFilterElementDepth(element: Element): number {
  let depth = 0;
  let current: Element | null = element;
  while (current?.parentElement) {
    depth += 1;
    current = current.parentElement;
  }
  return depth;
}

function jammerContentFilterCandidateText(element: HTMLElement): string {
  return (element.innerText ?? "").replace(/\s+/g, " ").trim();
}

function jammerContentFilterAttributeText(element: HTMLElement): string {
  const values: string[] = [];

  for (const node of Array.from(
    element.querySelectorAll<HTMLElement>("[aria-label],[title],img[alt],a[title]")
  ).slice(0, 40)) {
    const aria = node.getAttribute("aria-label");
    const title = node.getAttribute("title");
    const alt = node instanceof HTMLImageElement ? node.alt : null;
    if (aria) values.push(aria);
    if (title) values.push(title);
    if (alt) values.push(alt);
  }

  const selfAria = element.getAttribute("aria-label");
  const selfTitle = element.getAttribute("title");
  if (selfAria) values.push(selfAria);
  if (selfTitle) values.push(selfTitle);

  return values.join(" ").replace(/\s+/g, " ").trim().slice(0, 4_000);
}

function jammerContentFilterCandidateEligible(element: HTMLElement): boolean {
  if (!element.isConnected) return false;
  if (element.hasAttribute(JAMMER_CONTENT_FILTER_REVEALED_ATTR)) return false;
  if (element.hasAttribute(JAMMER_CONTENT_FILTER_MASK_ATTR)) return false;
  if (element.closest(`[${JAMMER_CONTENT_FILTER_PLACEHOLDER_ATTR}]`)) return false;
  if (element.closest("nav,header,footer,form,[role='navigation'],[role='banner'],[role='contentinfo']")) {
    return false;
  }
  if (element.querySelector(`[${JAMMER_CONTENT_FILTER_MASK_ATTR}="true"]`)) return false;
  if (element.closest(`[${JAMMER_CONTENT_FILTER_MASK_ATTR}="true"]`)) return false;

  const text = jammerContentFilterCandidateText(element);
  if (text.length < 24 || text.length > 8_000) return false;

  const style = getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") return false;
  return true;
}

function jammerContentFilterPromoteTarget(element: HTMLElement): HTMLElement {
  if (element.matches("p,h1,h2,h3,h4,h5,h6")) {
    const container = element.closest<HTMLElement>(JAMMER_CONTENT_FILTER_CONTAINER_SELECTOR);
    if (container) {
      const text = jammerContentFilterCandidateText(container);
      if (text.length >= 24 && text.length <= 8_000) return container;
    }
  }
  return element;
}

function jammerContentFilterSampleForElement(element: HTMLElement): JammerContentSample {
  const headings = Array.from(element.querySelectorAll<HTMLElement>("h1,h2,h3,h4"))
    .slice(0, 8)
    .map((node) => node.innerText)
    .join(" ");

  const selfHeading = element.matches("h1,h2,h3,h4")
    ? element.innerText
    : "";

  return {
    title: "",
    description: jammerContentFilterAttributeText(element),
    headings: [selfHeading, headings].filter(Boolean).join(" "),
    body: jammerContentFilterCandidateText(element).slice(0, 8_000)
  };
}

function jammerContentFilterRestoreElement(element: HTMLElement): void {
  const id = element.getAttribute(JAMMER_CONTENT_FILTER_ID_ATTR);
  if (id) {
    document.querySelector<HTMLElement>(
      `[${JAMMER_CONTENT_FILTER_PLACEHOLDER_ATTR}="${CSS.escape(id)}"]`
    )?.remove();
  }

  const originalDisplay = element.dataset.jammerContentOriginalDisplay;
  const originalPriority = element.dataset.jammerContentOriginalDisplayPriority;

  if (originalDisplay) {
    element.style.setProperty("display", originalDisplay, originalPriority ?? "");
  } else {
    element.style.removeProperty("display");
  }

  delete element.dataset.jammerContentOriginalDisplay;
  delete element.dataset.jammerContentOriginalDisplayPriority;
  element.removeAttribute(JAMMER_CONTENT_FILTER_MASK_ATTR);
  element.removeAttribute(JAMMER_CONTENT_FILTER_ID_ATTR);
}

function jammerContentFilterRestoreAll(): void {
  document.querySelectorAll<HTMLElement>(
    `[${JAMMER_CONTENT_FILTER_MASK_ATTR}="true"]`
  ).forEach(jammerContentFilterRestoreElement);

  document.querySelectorAll<HTMLElement>(
    `[${JAMMER_CONTENT_FILTER_PLACEHOLDER_ATTR}]`
  ).forEach((element) => element.remove());
}

function jammerContentFilterCreatePlaceholder(
  element: HTMLElement,
  settings: JammerContentFilterSettings,
  matches: JammerContentMatch[]
): HTMLElement {
  const language = jammerContentFilterResolvedLanguage(settings.language);
  const id = `jammer-mask-${++jammerContentMaskSequence}`;
  const labels = matches
    .slice(0, 2)
    .map((match) => jammerContentFilterCategoryLabel(match.category, language));
  const signals = Array.from(new Set(matches.flatMap((match) => match.matchedTerms))).slice(0, 4);

  const placeholder = document.createElement("div");
  placeholder.setAttribute(JAMMER_CONTENT_FILTER_PLACEHOLDER_ATTR, id);
  placeholder.setAttribute("role", "note");
  placeholder.style.cssText = [
    "display:block",
    "box-sizing:border-box",
    "width:100%",
    "min-height:88px",
    "margin:8px 0",
    "padding:14px",
    "border:1px solid rgba(99,102,241,.42)",
    "border-radius:12px",
    "background:linear-gradient(135deg,rgba(17,24,39,.96),rgba(30,41,59,.96))",
    "box-shadow:0 8px 24px rgba(15,23,42,.18)",
    "color:#f8fafc",
    "font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    "line-height:1.45"
  ].join(";");

  const title = document.createElement("div");
  title.textContent = language === "zh-CN"
    ? `Jammer 已隐藏：${labels.join("、")}`
    : `Jammer hid: ${labels.join(", ")}`;
  title.style.cssText = "font-size:14px;font-weight:750;margin-bottom:5px;";

  const detail = document.createElement("div");
  detail.textContent = language === "zh-CN"
    ? `本地匹配信号：${signals.join("、") || "已选内容类别"}。可能存在误判。`
    : `Local match signals: ${signals.join(", ") || "selected category"}. False positives are possible.`;
  detail.style.cssText = "font-size:12px;color:#cbd5e1;margin-bottom:10px;";

  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;";

  const reveal = document.createElement("button");
  reveal.type = "button";
  reveal.textContent = language === "zh-CN" ? "显示这段内容" : "Show this content";
  reveal.style.cssText = [
    "border:0",
    "border-radius:9px",
    "padding:7px 11px",
    "cursor:pointer",
    "font:inherit",
    "font-size:12px",
    "font-weight:700",
    "background:#4f46e5",
    "color:white"
  ].join(";");
  reveal.addEventListener("click", () => {
    element.setAttribute(JAMMER_CONTENT_FILTER_REVEALED_ATTR, "true");
    jammerContentFilterRestoreElement(element);
  });

  const exitPage = document.createElement("button");
  exitPage.type = "button";
  exitPage.textContent = language === "zh-CN" ? "退出此网页" : "Leave this page";
  exitPage.style.cssText = [
    "border:1px solid #7f1d1d",
    "border-radius:9px",
    "padding:7px 11px",
    "cursor:pointer",
    "font:inherit",
    "font-size:12px",
    "font-weight:700",
    "background:#450a0a",
    "color:#fee2e2"
  ].join(";");
  exitPage.addEventListener("click", () => {
    if (window !== window.top) return;
    if (history.length > 1) {
      history.back();
      window.setTimeout(() => {
        try {
          location.replace("about:blank");
        } catch {
          // Navigation may already be in progress.
        }
      }, 700);
      return;
    }
    location.replace("about:blank");
  });

  const allowSite = document.createElement("button");
  allowSite.type = "button";
  allowSite.textContent = language === "zh-CN" ? "此网站不做内容过滤" : "Skip content filtering on this site";
  allowSite.style.cssText = [
    "border:1px solid #475569",
    "border-radius:9px",
    "padding:7px 11px",
    "cursor:pointer",
    "font:inherit",
    "font-size:12px",
    "font-weight:700",
    "background:#1e293b",
    "color:#f8fafc"
  ].join(";");
  allowSite.addEventListener("click", () => {
    void jammerContentFilterLoadSettings().then(async (latest) => {
      const hostname = location.hostname.toLocaleLowerCase().replace(/\.$/, "");
      if (hostname && !latest.contentAllowlist.includes(hostname)) {
        latest.contentAllowlist = [...latest.contentAllowlist, hostname];
        await jammerContentFilterSaveSettings(latest);
      }
      jammerContentFilterRestoreAll();
    });
  });

  const privacy = document.createElement("div");
  privacy.textContent = language === "zh-CN"
    ? "只在本机判断；网页文字不会发送到 Jammer 服务器。"
    : "Matched on-device; page text is not sent to a Jammer server.";
  privacy.style.cssText = "font-size:10px;color:#94a3b8;margin-top:9px;";

  actions.append(reveal);
  if (window === window.top) actions.append(exitPage);
  actions.append(allowSite);
  placeholder.append(title, detail, actions, privacy);
  return placeholder;
}

function jammerContentFilterMaskElement(
  element: HTMLElement,
  settings: JammerContentFilterSettings,
  matches: JammerContentMatch[]
): void {
  if (element.hasAttribute(JAMMER_CONTENT_FILTER_MASK_ATTR)) return;
  if (element.hasAttribute(JAMMER_CONTENT_FILTER_REVEALED_ATTR)) return;

  const placeholder = jammerContentFilterCreatePlaceholder(element, settings, matches);
  const id = placeholder.getAttribute(JAMMER_CONTENT_FILTER_PLACEHOLDER_ATTR);
  if (!id) return;

  element.dataset.jammerContentOriginalDisplay = element.style.getPropertyValue("display");
  element.dataset.jammerContentOriginalDisplayPriority = element.style.getPropertyPriority("display");
  element.setAttribute(JAMMER_CONTENT_FILTER_MASK_ATTR, "true");
  element.setAttribute(JAMMER_CONTENT_FILTER_ID_ATTR, id);

  element.parentNode?.insertBefore(placeholder, element);
  element.style.setProperty("display", "none", "important");
}

function jammerContentFilterCollectCandidates(root: ParentNode = document): HTMLElement[] {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(JAMMER_CONTENT_FILTER_CANDIDATE_SELECTOR));
  if (root instanceof HTMLElement && root.matches(JAMMER_CONTENT_FILTER_CANDIDATE_SELECTOR)) {
    nodes.push(root);
  }

  const unique = Array.from(new Set(nodes));
  return unique.sort((a, b) => {
    const depthDelta = jammerContentFilterElementDepth(b) - jammerContentFilterElementDepth(a);
    if (depthDelta !== 0) return depthDelta;
    return jammerContentFilterCandidateText(a).length - jammerContentFilterCandidateText(b).length;
  });
}

async function jammerContentFilterScan(root: ParentNode = document): Promise<void> {
  const settings = await jammerContentFilterLoadSettings();
  const anyCategory = Object.values(settings.contentCategories).some(Boolean);

  if (
    !settings.enabled ||
    !settings.contentEnabled ||
    !anyCategory ||
    jammerContentFilterHostnameAllowed(location.hostname, settings.contentAllowlist)
  ) {
    jammerContentFilterRestoreAll();
    return;
  }

  const classifier = jammerContentFilterClassifier();
  const candidates = jammerContentFilterCollectCandidates(root).slice(0, 300);

  for (const candidate of candidates) {
    if (!jammerContentFilterCandidateEligible(candidate)) continue;

    const matches = classifier.classify(
      jammerContentFilterSampleForElement(candidate),
      settings.contentCategories
    );
    if (matches.length === 0) continue;

    const target = jammerContentFilterPromoteTarget(candidate);
    if (!jammerContentFilterCandidateEligible(target)) continue;
    jammerContentFilterMaskElement(target, settings, matches);
  }
}

function jammerContentFilterQueueScan(root: ParentNode = document): void {
  if (jammerContentScanQueued) return;
  jammerContentScanQueued = true;

  window.setTimeout(() => {
    jammerContentScanQueued = false;
    void jammerContentFilterScan(root).catch(() => undefined);
  }, 180);
}

function jammerContentFilterStopDelayedScans(): void {
  for (const timer of jammerContentDelayedTimers) clearTimeout(timer);
  jammerContentDelayedTimers = [];
}

function jammerContentFilterStart(): void {
  jammerContentFilterStopDelayedScans();
  jammerContentFilterQueueScan(document);

  jammerContentDelayedTimers = [700, 1800, 4000].map((delay) =>
    window.setTimeout(() => {
      void jammerContentFilterScan(document).catch(() => undefined);
    }, delay)
  );

  jammerContentObserver?.disconnect();
  jammerContentObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList" || mutation.addedNodes.length === 0) continue;

      for (const added of Array.from(mutation.addedNodes)) {
        if (!(added instanceof HTMLElement)) continue;
        if (added.closest(`[${JAMMER_CONTENT_FILTER_PLACEHOLDER_ATTR}]`)) continue;
        jammerContentFilterQueueScan(added);
        return;
      }
    }
  });

  if (document.body) {
    jammerContentObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !(JAMMER_CONTENT_FILTER_STORAGE_KEY in changes)) return;

  void jammerContentFilterLoadSettings().then((settings) => {
    const active =
      settings.enabled &&
      settings.contentEnabled &&
      Object.values(settings.contentCategories).some(Boolean) &&
      !jammerContentFilterHostnameAllowed(location.hostname, settings.contentAllowlist);

    if (!active) {
      jammerContentObserver?.disconnect();
      jammerContentFilterStopDelayedScans();
      jammerContentFilterRestoreAll();
      return;
    }

    jammerContentFilterRestoreAll();
    document.querySelectorAll<HTMLElement>(
      `[${JAMMER_CONTENT_FILTER_REVEALED_ATTR}="true"]`
    ).forEach((element) => element.removeAttribute(JAMMER_CONTENT_FILTER_REVEALED_ATTR));
    jammerContentFilterStart();
  }).catch(() => undefined);
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", jammerContentFilterStart, { once: true });
} else {
  jammerContentFilterStart();
}
