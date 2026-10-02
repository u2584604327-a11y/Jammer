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
const JAMMER_CONTENT_FILTER_HOST_ID = "jammer-content-warning-host";
const JAMMER_CONTENT_FILTER_DEFAULT_CATEGORIES: JammerContentFilterCategories = {
  gambling: false,
  explicit: false,
  violence: false,
  scam: false,
  clickbait: false
};

let jammerContentDismissedForPage = false;
let jammerContentScanTimer: number | undefined;

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

function jammerContentFilterRemoveOverlay(): void {
  document.getElementById(JAMMER_CONTENT_FILTER_HOST_ID)?.remove();
}

function jammerContentFilterSample(): {
  title: string;
  description: string;
  headings: string;
  body: string;
} {
  const description =
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ?? "";
  const headings = Array.from(document.querySelectorAll<HTMLElement>("h1,h2,h3"))
    .slice(0, 80)
    .map((node) => node.innerText)
    .join(" ");
  const body = document.body?.innerText ?? "";

  return {
    title: document.title ?? "",
    description,
    headings,
    body
  };
}

function jammerContentFilterRenderWarning(
  settings: JammerContentFilterSettings,
  matches: JammerContentMatch[]
): void {
  if (jammerContentDismissedForPage || matches.length === 0) return;

  jammerContentFilterRemoveOverlay();

  const language = jammerContentFilterResolvedLanguage(settings.language);
  const top = matches[0];
  const labels = matches
    .slice(0, 3)
    .map((match) => jammerContentFilterCategoryLabel(match.category, language));
  const signals = Array.from(new Set(matches.flatMap((match) => match.matchedTerms))).slice(0, 5);

  const host = document.createElement("div");
  host.id = JAMMER_CONTENT_FILTER_HOST_ID;
  host.style.cssText = "position:fixed;inset:0;z-index:2147483647;";
  const shadow = host.attachShadow({ mode: "closed" });

  const wrapper = document.createElement("div");
  wrapper.setAttribute("role", "dialog");
  wrapper.setAttribute("aria-modal", "true");
  wrapper.style.cssText = [
    "position:fixed",
    "inset:0",
    "display:grid",
    "place-items:center",
    "padding:24px",
    "background:rgba(7,14,31,.84)",
    "backdrop-filter:blur(16px)",
    "font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    "color:#f8fafc"
  ].join(";");

  const card = document.createElement("div");
  card.style.cssText = [
    "width:min(560px,100%)",
    "border:1px solid rgba(255,255,255,.18)",
    "border-radius:20px",
    "background:#111a2e",
    "box-shadow:0 24px 80px rgba(0,0,0,.48)",
    "padding:24px"
  ].join(";");

  const badge = document.createElement("div");
  badge.textContent = "J";
  badge.style.cssText = [
    "width:46px",
    "height:46px",
    "display:grid",
    "place-items:center",
    "border-radius:13px",
    "background:linear-gradient(145deg,#4f46e5,#06b6d4)",
    "font-size:25px",
    "font-weight:800",
    "margin-bottom:16px"
  ].join(";");

  const title = document.createElement("h1");
  title.textContent = language === "zh-CN"
    ? "Jammer 检测到你选择过滤的内容"
    : "Jammer detected a selected content category";
  title.style.cssText = "font-size:22px;line-height:1.3;margin:0 0 10px;";

  const detail = document.createElement("p");
  detail.textContent = language === "zh-CN"
    ? `匹配类别：${labels.join("、")}。这是本地关键词评分结果，可能出现误判。`
    : `Matched: ${labels.join(", ")}. This is a local keyword-score result and may be a false positive.`;
  detail.style.cssText = "margin:0 0 12px;color:#cbd5e1;line-height:1.55;font-size:14px;";

  const reason = document.createElement("p");
  reason.textContent = language === "zh-CN"
    ? `匹配信号：${signals.join("、") || jammerContentFilterCategoryLabel(top.category, language)}`
    : `Matched signals: ${signals.join(", ") || jammerContentFilterCategoryLabel(top.category, language)}`;
  reason.style.cssText = "margin:0 0 18px;color:#94a3b8;font-size:12px;line-height:1.5;";

  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;gap:10px;flex-wrap:wrap;";

  const show = document.createElement("button");
  show.type = "button";
  show.textContent = language === "zh-CN" ? "仍然显示本页" : "Show this page";
  show.style.cssText = [
    "border:0",
    "border-radius:11px",
    "padding:10px 14px",
    "font:inherit",
    "font-weight:700",
    "cursor:pointer",
    "background:#4f46e5",
    "color:white"
  ].join(";");
  show.addEventListener("click", () => {
    jammerContentDismissedForPage = true;
    jammerContentFilterRemoveOverlay();
  });

  const always = document.createElement("button");
  always.type = "button";
  always.textContent = language === "zh-CN" ? "始终允许此网站" : "Always allow this site";
  always.style.cssText = [
    "border:1px solid #334155",
    "border-radius:11px",
    "padding:10px 14px",
    "font:inherit",
    "font-weight:700",
    "cursor:pointer",
    "background:#1e293b",
    "color:#f8fafc"
  ].join(";");
  always.addEventListener("click", () => {
    void jammerContentFilterLoadSettings().then(async (latest) => {
      const hostname = location.hostname.toLocaleLowerCase().replace(/\.$/, "");
      if (hostname && !latest.contentAllowlist.includes(hostname)) {
        latest.contentAllowlist = [...latest.contentAllowlist, hostname];
        await jammerContentFilterSaveSettings(latest);
      }
      jammerContentDismissedForPage = true;
      jammerContentFilterRemoveOverlay();
    });
  });

  const note = document.createElement("p");
  note.textContent = language === "zh-CN"
    ? "页面文本只在本机匹配，不会发送到 Jammer 服务器。"
    : "Page text is matched locally and is not sent to a Jammer server.";
  note.style.cssText = "margin:16px 0 0;color:#94a3b8;font-size:11px;line-height:1.5;";

  actions.append(show, always);
  card.append(badge, title, detail, reason, actions, note);
  wrapper.append(card);
  shadow.append(wrapper);
  document.documentElement.append(host);
}

async function jammerContentFilterEvaluate(): Promise<void> {
  if (jammerContentDismissedForPage) return;

  const settings = await jammerContentFilterLoadSettings();
  const anyCategory = Object.values(settings.contentCategories).some(Boolean);

  if (
    !settings.enabled ||
    !settings.contentEnabled ||
    !anyCategory ||
    jammerContentFilterHostnameAllowed(location.hostname, settings.contentAllowlist)
  ) {
    jammerContentFilterRemoveOverlay();
    return;
  }

  const matches = globalThis.JammerContentClassifier.classify(
    jammerContentFilterSample(),
    settings.contentCategories
  );

  if (matches.length === 0) {
    jammerContentFilterRemoveOverlay();
    return;
  }

  jammerContentFilterRenderWarning(settings, matches);
}

function jammerContentFilterScheduleScans(): void {
  let remaining = 5;
  const run = () => {
    void jammerContentFilterEvaluate().catch(() => undefined);
    remaining -= 1;
    if (remaining <= 0 && jammerContentScanTimer !== undefined) {
      clearInterval(jammerContentScanTimer);
      jammerContentScanTimer = undefined;
    }
  };

  run();
  jammerContentScanTimer = window.setInterval(run, 1000);
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !(JAMMER_CONTENT_FILTER_STORAGE_KEY in changes)) return;
  jammerContentDismissedForPage = false;
  void jammerContentFilterEvaluate().catch(() => undefined);
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", jammerContentFilterScheduleScans, { once: true });
} else {
  jammerContentFilterScheduleScans();
}
