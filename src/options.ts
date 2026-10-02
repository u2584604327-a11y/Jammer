type OptionsLanguagePreference = "auto" | "zh-CN" | "en";
type OptionsResolvedLanguage = "zh-CN" | "en";
type OptionsContentCategory = "gambling" | "explicit" | "violence" | "scam" | "clickbait";
type OptionsContentCategories = Record<OptionsContentCategory, boolean>;

interface OptionsSettings {
  enabled: boolean;
  adsEnabled: boolean;
  privacyEnabled: boolean;
  phishingEnabled: boolean;
  secureNavigationEnabled: boolean;
  cosmeticEnabled: boolean;
  contentEnabled: boolean;
  contentCategories: OptionsContentCategories;
  language: OptionsLanguagePreference;
  allowlist: string[];
  contentAllowlist: string[];
  blockedDomains: string[];
}

const OPTIONS_STORAGE_KEY = "jammerSettings";
const OPTIONS_ADS_RULESET_IDS = ["ads_static", "ads_extended"] as const;
const OPTIONS_PRIVACY_RULESET_ID = "privacy_static";
const OPTIONS_PHISHING_RULESET_ID = "phishing_static";
const OPTIONS_ALLOWLIST_RULE_ID_BASE = 1_000_000;
const OPTIONS_ALLOWLIST_RULE_ID_LIMIT = 1_999_999;
const OPTIONS_BLOCKED_RULE_ID_BASE = 2_000_000;
const OPTIONS_BLOCKED_RULE_ID_LIMIT = 2_999_999;
const OPTIONS_HTTPS_UPGRADE_RULE_ID = 3_000_000;
const OPTIONS_COSMETIC_SCRIPT_ID = "jammer-cosmetic-css";
const OPTIONS_COSMETIC_SITE_SCRIPT_ID = "jammer-cosmetic-canyoublockit";
const OPTIONS_AD_HEURISTIC_SCRIPT_ID = "jammer-ad-cleanup";
const OPTIONS_CONTENT_SCRIPT_ID = "jammer-content-filter";
const OPTIONS_COSMETIC_ORIGINS = ["http://*/*", "https://*/*"];

const OPTIONS_DEFAULT_CATEGORIES: OptionsContentCategories = {
  gambling: false,
  explicit: false,
  violence: false,
  scam: false,
  clickbait: false
};

const OPTIONS_DEFAULT_SETTINGS: OptionsSettings = {
  enabled: true,
  adsEnabled: true,
  privacyEnabled: true,
  phishingEnabled: true,
  secureNavigationEnabled: false,
  cosmeticEnabled: false,
  contentEnabled: false,
  contentCategories: { ...OPTIONS_DEFAULT_CATEGORIES },
  language: "auto",
  allowlist: [],
  contentAllowlist: [],
  blockedDomains: []
};

const OPTIONS_STRINGS: Record<OptionsResolvedLanguage, Record<string, string>> = {
  en: {
    title: "Jammer Options",
    master: "Jammer protection",
    network: "Network ad & script blocking",
    privacy: "Privacy / tracker blocking",
    privacyDescription: "Blocks packaged known tracking endpoints for scripts, pixels, XHR, pings, and embedded frames.",
    phishing: "Known phishing-site blocking",
    phishingDescription: "Blocks top-level and embedded navigation to domains from a pinned active phishing feed.",
    secureNavigation: "Upgrade HTTP navigation to HTTPS",
    secureNavigationDescription: "Optional. Upgrades HTTP page/frame navigation to HTTPS when the destination supports it; some legacy HTTP-only sites may fail.",
    blockedTitle: "Dangerous-site block list",
    blockedDescription: "Domains added here are blocked for top-level and embedded navigation. Redirects to listed domains are blocked; this does not replace browser Secure DNS.",
    cosmeticTitle: "Page ad cleanup",
    cosmeticLabel: "Hide page ad containers",
    cosmeticDescription:
      "Optional. When enabled, Edge asks for website access so Jammer can apply packaged CSS plus local element heuristics for self-hosted and dynamic ads.",
    cosmeticReload: "Reload open pages after changing this setting. Allowlisted sites are excluded.",
    contentTitle: "Content filtering",
    contentMaster: "Hide matched content blocks",
    contentDescription:
      "Optional local text matching. Jammer reads visible page text on-device only when this feature is enabled and never uploads the page text.",
    contentReload:
      "After first enabling, reload open pages once. Existing filtered pages react to later setting changes.",
    gambling: "Gambling / betting promotion",
    explicit: "Explicit sexual material",
    violence: "Graphic violence",
    scam: "Scam-like promotion",
    clickbait: "Clickbait / nuisance",
    contentAllowlistTitle: "Content-filter exceptions",
    contentAllowlistDescription:
      "Sites listed here skip content masking but can still use normal ad blocking.",
    allowlistTitle: "Ad-block allowlist",
    allowlistDescription: "Enter a domain manually. Jammer does not read the current tab.",
    add: "Add",
    remove: "Remove",
    auto: "Auto",
    permissionDenied: "Website access was not granted. This feature remains off.",
    cosmeticEnabled: "Page ad cleanup enabled. Reload open pages.",
    cosmeticDisabled: "Page ad cleanup disabled.",
    contentEnabled: "Content masking enabled. Reload already-open pages once.",
    contentDisabled: "Content filtering disabled.",
    contentSelectCategory: "Select at least one content category first.",
    protectionUpdated: "Protection setting updated.",
    networkUpdated: "Network ad & script blocking updated.",
    privacyUpdated: "Privacy / tracker blocking updated.",
    phishingUpdated: "Known phishing-site blocking updated.",
    secureNavigationUpdated: "HTTPS navigation upgrade updated.",
    blockedUpdated: "Dangerous-site block list updated.",
    allowlistUpdated: "Ad-block allowlist updated.",
    contentAllowlistUpdated: "Content-filter exceptions updated.",
    categoriesUpdated: "Content categories updated.",
    duplicate: "That domain is already listed.",
    invalid: "Enter a valid domain.",
    fullyQualified: "Enter a fully qualified domain.",
    httpOnly: "Only http/https domains are supported.",
    credentials: "Credentials are not allowed in allowlist entries."
  },
  "zh-CN": {
    title: "Jammer 设置",
    master: "Jammer 总保护",
    network: "网络广告 / 广告脚本拦截",
    privacy: "隐私 / 跟踪器拦截",
    privacyDescription: "拦截扩展内置规则识别的跟踪脚本、像素、XHR、Ping 和嵌入框架请求。",
    phishing: "已知钓鱼网站拦截",
    phishingDescription: "使用固定并校验过的活跃钓鱼域名数据，阻止顶层网页或嵌入页面跳转到已知钓鱼域名。",
    secureNavigation: "HTTP 导航自动升级到 HTTPS",
    secureNavigationDescription: "可选。将 HTTP 页面/框架导航升级为 HTTPS；部分仅支持 HTTP 的旧网站可能无法打开。",
    blockedTitle: "危险网站拦截列表",
    blockedDescription: "这里的域名会被禁止作为顶层网页或嵌入页面打开，可拦截跳转到已列入域名的请求；它不能替代浏览器的安全 DNS。",
    cosmeticTitle: "页面广告清理",
    cosmeticLabel: "隐藏页面广告容器",
    cosmeticDescription:
      "可选功能。启用后会请求网站访问权限，使用内置 CSS 与本地元素特征识别，清理自托管横幅、动态广告和常见广告容器。",
    cosmeticReload: "修改后请刷新已打开页面。广告白名单网站不会注入页面广告清理 CSS。",
    contentTitle: "内容过滤",
    contentMaster: "只隐藏命中的内容块",
    contentDescription:
      "可选的本地文本匹配。仅在启用后读取当前网页可见文本并在设备本地判断，不会把网页正文上传到 Jammer 服务器。",
    contentReload: "首次启用后，请刷新已经打开的页面一次。之后修改设置时，已加载的过滤脚本会响应变化。",
    gambling: "赌博 / 博彩推广",
    explicit: "露骨色情内容",
    violence: "血腥 / 严重暴力内容",
    scam: "疑似诈骗诱导",
    clickbait: "标题党 / 诱导内容",
    contentAllowlistTitle: "内容过滤例外",
    contentAllowlistDescription: "这里的站点不会执行内容遮蔽，但仍可继续使用广告拦截。",
    allowlistTitle: "广告拦截白名单",
    allowlistDescription: "手动输入域名。Jammer 不读取当前标签页地址。",
    add: "添加",
    remove: "删除",
    auto: "自动",
    permissionDenied: "未授予网站访问权限，该功能保持关闭。",
    cosmeticEnabled: "页面广告清理已启用，请刷新已打开页面。",
    cosmeticDisabled: "页面广告清理已关闭。",
    contentEnabled: "内容遮蔽已启用。请把已打开页面刷新一次。",
    contentDisabled: "内容过滤已关闭。",
    contentSelectCategory: "请先至少选择一个内容类别。",
    protectionUpdated: "总保护设置已更新。",
    networkUpdated: "网络广告 / 广告脚本拦截设置已更新。",
    privacyUpdated: "隐私 / 跟踪器拦截设置已更新。",
    phishingUpdated: "已知钓鱼网站拦截设置已更新。",
    secureNavigationUpdated: "HTTPS 导航升级设置已更新。",
    blockedUpdated: "危险网站拦截列表已更新。",
    allowlistUpdated: "广告拦截白名单已更新。",
    contentAllowlistUpdated: "内容过滤例外已更新。",
    categoriesUpdated: "内容过滤类别已更新。",
    duplicate: "该域名已经存在。",
    invalid: "请输入有效域名。",
    fullyQualified: "请输入完整域名。",
    httpOnly: "仅支持 http/https 域名。",
    credentials: "域名条目中不允许包含账号凭据。"
  }
};

const OPTIONS_ALLOWLIST_RESOURCE_TYPES: JammerResourceType[] = [
  "sub_frame",
  "stylesheet",
  "script",
  "image",
  "font",
  "object",
  "xmlhttprequest",
  "ping",
  "csp_report",
  "media",
  "websocket",
  "webtransport",
  "webbundle",
  "other"
];

const OPTIONS_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function optionsRequireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}

function optionsRuntimeError(prefix: string): Error {
  const message = chrome.runtime.lastError?.message;
  return new Error(message ? `${prefix}: ${message}` : prefix);
}

function optionsStorageGet(key: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, (items) => {
      if (chrome.runtime.lastError) {
        reject(optionsRuntimeError("Storage read failed"));
        return;
      }
      resolve(items);
    });
  });
}

function optionsStorageSet(items: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(optionsRuntimeError("Storage write failed"));
        return;
      }
      resolve();
    });
  });
}

function optionsPermissionContains(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.permissions.contains(
      { permissions: ["scripting"], origins: OPTIONS_COSMETIC_ORIGINS },
      (result) => {
        if (chrome.runtime.lastError) {
          reject(optionsRuntimeError("Permission check failed"));
          return;
        }
        resolve(result);
      }
    );
  });
}

function optionsPermissionRequest(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.permissions.request(
      { permissions: ["scripting"], origins: OPTIONS_COSMETIC_ORIGINS },
      (granted) => {
        if (chrome.runtime.lastError) {
          reject(optionsRuntimeError("Permission request failed"));
          return;
        }
        resolve(granted);
      }
    );
  });
}

function optionsPermissionRemove(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.permissions.remove(
      { permissions: ["scripting"], origins: OPTIONS_COSMETIC_ORIGINS },
      (removed) => {
        if (chrome.runtime.lastError) {
          reject(optionsRuntimeError("Permission removal failed"));
          return;
        }
        resolve(removed);
      }
    );
  });
}

function optionsHostPermissionContains(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.permissions.contains(
      { origins: OPTIONS_COSMETIC_ORIGINS },
      (result) => {
        if (chrome.runtime.lastError) {
          reject(optionsRuntimeError("Host permission check failed"));
          return;
        }
        resolve(result);
      }
    );
  });
}

function optionsHostPermissionRequest(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.permissions.request(
      { origins: OPTIONS_COSMETIC_ORIGINS },
      (granted) => {
        if (chrome.runtime.lastError) {
          reject(optionsRuntimeError("Host permission request failed"));
          return;
        }
        resolve(granted);
      }
    );
  });
}

function optionsHostPermissionRemove(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.permissions.remove(
      { origins: OPTIONS_COSMETIC_ORIGINS },
      (removed) => {
        if (chrome.runtime.lastError) {
          reject(optionsRuntimeError("Host permission removal failed"));
          return;
        }
        resolve(removed);
      }
    );
  });
}

function optionsScriptingPermissionContains(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.permissions.contains(
      { permissions: ["scripting"] },
      (result) => {
        if (chrome.runtime.lastError) {
          reject(optionsRuntimeError("Scripting permission check failed"));
          return;
        }
        resolve(result);
      }
    );
  });
}

function optionsScriptingPermissionRemove(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.permissions.remove(
      { permissions: ["scripting"] },
      (removed) => {
        if (chrome.runtime.lastError) {
          reject(optionsRuntimeError("Scripting permission removal failed"));
          return;
        }
        resolve(removed);
      }
    );
  });
}

function optionsGetRegisteredScripts(ids: string[]): Promise<JammerContentScript[]> {
  return new Promise((resolve, reject) => {
    chrome.scripting.getRegisteredContentScripts({ ids }, (scripts) => {
      if (chrome.runtime.lastError) {
        reject(optionsRuntimeError("Registered content-script read failed"));
        return;
      }
      resolve(scripts);
    });
  });
}

function optionsRegisterScripts(scripts: JammerContentScript[]): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.scripting.registerContentScripts(scripts, () => {
      if (chrome.runtime.lastError) {
        reject(optionsRuntimeError("Content-script registration failed"));
        return;
      }
      resolve();
    });
  });
}

function optionsUnregisterScripts(ids: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.scripting.unregisterContentScripts({ ids }, () => {
      if (chrome.runtime.lastError) {
        reject(optionsRuntimeError("Content-script unregister failed"));
        return;
      }
      resolve();
    });
  });
}

async function optionsUnregisterIfPresent(ids: string[]): Promise<void> {
  const granted = await optionsPermissionContains();
  if (!granted) return;
  const existing = await optionsGetRegisteredScripts(ids);
  if (existing.length > 0) await optionsUnregisterScripts(existing.map((item) => item.id));
}

function optionsDomainExcludeMatches(domains: string[]): string[] {
  return domains.flatMap((domain) => {
    const exact = `*://${domain}/*`;
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(domain)) return [exact];
    return [exact, `*://*.${domain}/*`];
  });
}

function optionsHasSelectedContentCategory(settings: OptionsSettings): boolean {
  return Object.values(settings.contentCategories).some(Boolean);
}

async function optionsApplyCosmetic(settings: OptionsSettings): Promise<void> {
  const granted = await optionsPermissionContains();
  const ids = [
    OPTIONS_COSMETIC_SCRIPT_ID,
    OPTIONS_COSMETIC_SITE_SCRIPT_ID,
    OPTIONS_AD_HEURISTIC_SCRIPT_ID
  ];
  const shouldEnable = settings.enabled && settings.cosmeticEnabled && granted;

  if (!shouldEnable) {
    if (granted) await optionsUnregisterIfPresent(ids);
    return;
  }

  await optionsUnregisterIfPresent(ids);
  await optionsRegisterScripts([
    {
      id: OPTIONS_COSMETIC_SCRIPT_ID,
      matches: OPTIONS_COSMETIC_ORIGINS,
      excludeMatches: optionsDomainExcludeMatches(settings.allowlist),
      css: ["cosmetic.css", "cosmetic-easylist.css"],
      runAt: "document_start",
      allFrames: true,
      persistAcrossSessions: true
    },
    {
      id: OPTIONS_COSMETIC_SITE_SCRIPT_ID,
      matches: ["*://canyoublockit.com/*", "*://*.canyoublockit.com/*"],
      excludeMatches: optionsDomainExcludeMatches(settings.allowlist),
      css: ["cosmetic-canyoublockit.css", "cosmetic-canyoublockit-local.css"],
      runAt: "document_start",
      allFrames: true,
      persistAcrossSessions: true
    },
    {
      id: OPTIONS_AD_HEURISTIC_SCRIPT_ID,
      matches: OPTIONS_COSMETIC_ORIGINS,
      excludeMatches: optionsDomainExcludeMatches(settings.allowlist),
      js: ["ad-cleanup.js"],
      runAt: "document_idle",
      allFrames: true,
      persistAcrossSessions: true
    }
  ]);
}

async function optionsApplyContentFilter(settings: OptionsSettings): Promise<void> {
  const granted = await optionsPermissionContains();
  const shouldEnable =
    settings.enabled &&
    settings.contentEnabled &&
    optionsHasSelectedContentCategory(settings) &&
    granted;

  if (!shouldEnable) {
    if (granted) await optionsUnregisterIfPresent([OPTIONS_CONTENT_SCRIPT_ID]);
    return;
  }

  await optionsUnregisterIfPresent([OPTIONS_CONTENT_SCRIPT_ID]);
  await optionsRegisterScripts([
    {
      id: OPTIONS_CONTENT_SCRIPT_ID,
      matches: OPTIONS_COSMETIC_ORIGINS,
      excludeMatches: optionsDomainExcludeMatches(settings.contentAllowlist),
      js: ["content-classifier.js", "content-filter.js"],
      runAt: "document_idle",
      allFrames: false,
      persistAcrossSessions: true
    }
  ]);
}

async function optionsMaybeRemoveSiteAccess(settings: OptionsSettings): Promise<void> {
  const needsScripting = settings.cosmeticEnabled || settings.contentEnabled;
  const needsHosts = needsScripting || settings.secureNavigationEnabled;

  if (!needsScripting && await optionsScriptingPermissionContains()) {
    await optionsScriptingPermissionRemove();
  }
  if (!needsHosts && await optionsHostPermissionContains()) {
    await optionsHostPermissionRemove();
  }
}

function optionsGetEnabledRulesets(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    chrome.declarativeNetRequest.getEnabledRulesets((rulesets) => {
      if (chrome.runtime.lastError) {
        reject(optionsRuntimeError("Ruleset read failed"));
        return;
      }
      resolve(rulesets);
    });
  });
}

function optionsUpdateEnabledRulesets(options: {
  enableRulesetIds?: string[];
  disableRulesetIds?: string[];
}): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.declarativeNetRequest.updateEnabledRulesets(options, () => {
      if (chrome.runtime.lastError) {
        reject(optionsRuntimeError("Ruleset update failed"));
        return;
      }
      resolve();
    });
  });
}

function optionsGetDynamicRules(): Promise<JammerDnrRule[]> {
  return new Promise((resolve, reject) => {
    chrome.declarativeNetRequest.getDynamicRules((rules) => {
      if (chrome.runtime.lastError) {
        reject(optionsRuntimeError("Dynamic rule read failed"));
        return;
      }
      resolve(rules);
    });
  });
}

function optionsUpdateDynamicRules(options: {
  removeRuleIds?: number[];
  addRules?: JammerDnrRule[];
}): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.declarativeNetRequest.updateDynamicRules(options, () => {
      if (chrome.runtime.lastError) {
        reject(optionsRuntimeError("Dynamic rule update failed"));
        return;
      }
      resolve();
    });
  });
}

function optionsSanitizeLanguage(value: unknown): OptionsLanguagePreference {
  return value === "zh-CN" || value === "en" || value === "auto" ? value : "auto";
}

function optionsSanitizeSettings(value: unknown): OptionsSettings {
  if (!value || typeof value !== "object") {
    return {
      ...OPTIONS_DEFAULT_SETTINGS,
      contentCategories: { ...OPTIONS_DEFAULT_CATEGORIES }
    };
  }

  const candidate = value as Partial<OptionsSettings>;
  const categories =
    candidate.contentCategories && typeof candidate.contentCategories === "object"
      ? candidate.contentCategories as Partial<OptionsContentCategories>
      : {};

  return {
    enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : true,
    adsEnabled: typeof candidate.adsEnabled === "boolean" ? candidate.adsEnabled : true,
    privacyEnabled: typeof candidate.privacyEnabled === "boolean" ? candidate.privacyEnabled : true,
    phishingEnabled: typeof candidate.phishingEnabled === "boolean" ? candidate.phishingEnabled : true,
    secureNavigationEnabled:
      typeof candidate.secureNavigationEnabled === "boolean" ? candidate.secureNavigationEnabled : false,
    cosmeticEnabled: typeof candidate.cosmeticEnabled === "boolean" ? candidate.cosmeticEnabled : false,
    contentEnabled: typeof candidate.contentEnabled === "boolean" ? candidate.contentEnabled : false,
    contentCategories: {
      gambling: categories.gambling === true,
      explicit: categories.explicit === true,
      violence: categories.violence === true,
      scam: categories.scam === true,
      clickbait: categories.clickbait === true
    },
    language: optionsSanitizeLanguage(candidate.language),
    allowlist: Array.isArray(candidate.allowlist)
      ? candidate.allowlist.filter((item): item is string => typeof item === "string")
      : [],
    contentAllowlist: Array.isArray(candidate.contentAllowlist)
      ? candidate.contentAllowlist.filter((item): item is string => typeof item === "string")
      : [],
    blockedDomains: Array.isArray(candidate.blockedDomains)
      ? candidate.blockedDomains.filter((item): item is string => typeof item === "string")
      : []
  };
}

function optionsResolveLanguage(preference: OptionsLanguagePreference): OptionsResolvedLanguage {
  if (preference === "zh-CN" || preference === "en") return preference;
  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

function optionsStrings(settings: OptionsSettings): Record<string, string> {
  return OPTIONS_STRINGS[optionsResolveLanguage(settings.language)];
}

function optionsNormalizeDomain(value: string, strings: Record<string, string>): string {
  const input = value.trim();
  if (!input) throw new Error(strings.invalid);

  let url: URL;
  try {
    url = new URL(input.includes("://") ? input : `https://${input}`);
  } catch {
    throw new Error(strings.invalid);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error(strings.httpOnly);
  if (url.username || url.password) throw new Error(strings.credentials);

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || hostname.length > 253 || !hostname.includes(".")) {
    throw new Error(strings.fullyQualified);
  }

  const labels = hostname.split(".");
  if (labels.some((label) => !OPTIONS_LABEL_RE.test(label))) throw new Error(strings.invalid);
  return hostname;
}

async function optionsLoadSettings(): Promise<OptionsSettings> {
  const stored = await optionsStorageGet(OPTIONS_STORAGE_KEY);
  return optionsSanitizeSettings(stored[OPTIONS_STORAGE_KEY]);
}

async function optionsSaveSettings(settings: OptionsSettings): Promise<void> {
  await optionsStorageSet({ [OPTIONS_STORAGE_KEY]: settings });
}

async function optionsApplyProtection(settings: OptionsSettings): Promise<void> {
  const enabled = await optionsGetEnabledRulesets();
  const desired = new Set<string>();

  if (settings.enabled && settings.adsEnabled) {
    for (const id of OPTIONS_ADS_RULESET_IDS) desired.add(id);
  }
  if (settings.enabled && settings.privacyEnabled) desired.add(OPTIONS_PRIVACY_RULESET_ID);
  if (settings.enabled && settings.phishingEnabled) desired.add(OPTIONS_PHISHING_RULESET_ID);

  const managed = [
    ...OPTIONS_ADS_RULESET_IDS,
    OPTIONS_PRIVACY_RULESET_ID,
    OPTIONS_PHISHING_RULESET_ID
  ];
  const enableRulesetIds = managed.filter((id) => desired.has(id) && !enabled.includes(id));
  const disableRulesetIds = managed.filter((id) => !desired.has(id) && enabled.includes(id));

  if (enableRulesetIds.length === 0 && disableRulesetIds.length === 0) return;
  await optionsUpdateEnabledRulesets({ enableRulesetIds, disableRulesetIds });
}

function optionsBuildAllowlistRules(domains: string[]): JammerDnrRule[] {
  return domains.map((domain, index) => ({
    id: OPTIONS_ALLOWLIST_RULE_ID_BASE + index,
    priority: 10_000,
    action: { type: "allow" },
    condition: {
      initiatorDomains: [domain],
      resourceTypes: OPTIONS_ALLOWLIST_RESOURCE_TYPES
    }
  }));
}

async function optionsSyncAllowlistRules(domains: string[]): Promise<void> {
  const existing = await optionsGetDynamicRules();
  const removeRuleIds = existing
    .filter((rule) => rule.id >= OPTIONS_ALLOWLIST_RULE_ID_BASE && rule.id <= OPTIONS_ALLOWLIST_RULE_ID_LIMIT)
    .map((rule) => rule.id);

  await optionsUpdateDynamicRules({
    removeRuleIds,
    addRules: optionsBuildAllowlistRules(domains)
  });
}

function optionsBuildBlockedDomainRules(domains: string[]): JammerDnrRule[] {
  return domains.map((domain, index) => ({
    id: OPTIONS_BLOCKED_RULE_ID_BASE + index,
    priority: 20_000,
    action: { type: "block" },
    condition: {
      urlFilter: `||${domain}^`,
      resourceTypes: ["main_frame", "sub_frame"]
    }
  }));
}

async function optionsSyncBlockedDomainRules(domains: string[]): Promise<void> {
  const existing = await optionsGetDynamicRules();
  const removeRuleIds = existing
    .filter((rule) => rule.id >= OPTIONS_BLOCKED_RULE_ID_BASE && rule.id <= OPTIONS_BLOCKED_RULE_ID_LIMIT)
    .map((rule) => rule.id);

  await optionsUpdateDynamicRules({
    removeRuleIds,
    addRules: optionsBuildBlockedDomainRules(domains)
  });
}

async function optionsSyncHttpsUpgradeRule(enabled: boolean): Promise<void> {
  const hostGranted = await optionsHostPermissionContains();
  const shouldEnable = enabled && hostGranted;

  await optionsUpdateDynamicRules({
    removeRuleIds: [OPTIONS_HTTPS_UPGRADE_RULE_ID],
    addRules: shouldEnable
      ? [{
          id: OPTIONS_HTTPS_UPGRADE_RULE_ID,
          priority: 5_000,
          action: { type: "upgradeScheme" },
          condition: {
            regexFilter: "^http://",
            resourceTypes: ["main_frame", "sub_frame"]
          }
        }]
      : []
  });
}

async function optionsApplySettings(settings: OptionsSettings): Promise<void> {
  await optionsApplyProtection(settings);
  await optionsSyncAllowlistRules(settings.allowlist);
  await optionsSyncBlockedDomainRules(settings.blockedDomains);
  await optionsSyncHttpsUpgradeRule(settings.enabled && settings.secureNavigationEnabled);
  await optionsApplyCosmetic(settings);
  await optionsApplyContentFilter(settings);
}

const title = optionsRequireElement<HTMLElement>("#options-title");
const master = optionsRequireElement<HTMLInputElement>("#master-enabled");
const ads = optionsRequireElement<HTMLInputElement>("#ads-enabled");
const privacy = optionsRequireElement<HTMLInputElement>("#privacy-enabled");
const phishing = optionsRequireElement<HTMLInputElement>("#phishing-enabled");
const secureNavigation = optionsRequireElement<HTMLInputElement>("#secure-navigation-enabled");
const cosmetic = optionsRequireElement<HTMLInputElement>("#cosmetic-enabled");
const contentEnabled = optionsRequireElement<HTMLInputElement>("#content-enabled");
const masterLabel = optionsRequireElement<HTMLElement>("#master-label");
const adsLabel = optionsRequireElement<HTMLElement>("#ads-label");
const privacyLabel = optionsRequireElement<HTMLElement>("#privacy-label");
const privacyDescription = optionsRequireElement<HTMLElement>("#privacy-description");
const phishingLabel = optionsRequireElement<HTMLElement>("#phishing-label");
const phishingDescription = optionsRequireElement<HTMLElement>("#phishing-description");
const secureNavigationLabel = optionsRequireElement<HTMLElement>("#secure-navigation-label");
const secureNavigationDescription = optionsRequireElement<HTMLElement>("#secure-navigation-description");
const cosmeticTitle = optionsRequireElement<HTMLElement>("#cosmetic-title");
const cosmeticLabel = optionsRequireElement<HTMLElement>("#cosmetic-label");
const cosmeticDescription = optionsRequireElement<HTMLElement>("#cosmetic-description");
const cosmeticReload = optionsRequireElement<HTMLElement>("#cosmetic-reload");
const contentTitle = optionsRequireElement<HTMLElement>("#content-title");
const contentMasterLabel = optionsRequireElement<HTMLElement>("#content-master-label");
const contentDescription = optionsRequireElement<HTMLElement>("#content-description");
const contentReload = optionsRequireElement<HTMLElement>("#content-reload");
const allowlistTitle = optionsRequireElement<HTMLElement>("#allowlist-title");
const allowlistDescription = optionsRequireElement<HTMLElement>("#allowlist-description");
const input = optionsRequireElement<HTMLInputElement>("#allowlist-input");
const addButton = optionsRequireElement<HTMLButtonElement>("#add-domain");
const list = optionsRequireElement<HTMLUListElement>("#allowlist");
const contentAllowlistTitle = optionsRequireElement<HTMLElement>("#content-allowlist-title");
const contentAllowlistDescription = optionsRequireElement<HTMLElement>("#content-allowlist-description");
const contentAllowlistInput = optionsRequireElement<HTMLInputElement>("#content-allowlist-input");
const contentAllowlistAdd = optionsRequireElement<HTMLButtonElement>("#add-content-domain");
const contentAllowlistList = optionsRequireElement<HTMLUListElement>("#content-allowlist");
const blockedTitle = optionsRequireElement<HTMLElement>("#blocked-title");
const blockedDescription = optionsRequireElement<HTMLElement>("#blocked-description");
const blockedInput = optionsRequireElement<HTMLInputElement>("#blocked-domain-input");
const blockedAdd = optionsRequireElement<HTMLButtonElement>("#add-blocked-domain");
const blockedList = optionsRequireElement<HTMLUListElement>("#blocked-domains");
const blockedMessage = optionsRequireElement<HTMLElement>("#blocked-message");
const message = optionsRequireElement<HTMLElement>("#message");
const contentMessage = optionsRequireElement<HTMLElement>("#content-message");
const languageSelect = optionsRequireElement<HTMLSelectElement>("#language-select");

const categoryCheckboxes: Record<OptionsContentCategory, HTMLInputElement> = {
  gambling: optionsRequireElement<HTMLInputElement>("#content-gambling"),
  explicit: optionsRequireElement<HTMLInputElement>("#content-explicit"),
  violence: optionsRequireElement<HTMLInputElement>("#content-violence"),
  scam: optionsRequireElement<HTMLInputElement>("#content-scam"),
  clickbait: optionsRequireElement<HTMLInputElement>("#content-clickbait")
};

const categoryLabels: Record<OptionsContentCategory, HTMLElement> = {
  gambling: optionsRequireElement<HTMLElement>("#content-gambling-label"),
  explicit: optionsRequireElement<HTMLElement>("#content-explicit-label"),
  violence: optionsRequireElement<HTMLElement>("#content-violence-label"),
  scam: optionsRequireElement<HTMLElement>("#content-scam-label"),
  clickbait: optionsRequireElement<HTMLElement>("#content-clickbait-label")
};

for (const element of [
  master,
  ads,
  privacy,
  phishing,
  secureNavigation,
  cosmetic,
  contentEnabled,
  input,
  addButton,
  contentAllowlistInput,
  contentAllowlistAdd,
  blockedInput,
  blockedAdd,
  languageSelect,
  ...Object.values(categoryCheckboxes)
]) {
  element.disabled = true;
}

let settings: OptionsSettings = {
  ...OPTIONS_DEFAULT_SETTINGS,
  contentCategories: { ...OPTIONS_DEFAULT_CATEGORIES }
};

function optionsApplyTranslations(): void {
  const language = optionsResolveLanguage(settings.language);
  const strings = OPTIONS_STRINGS[language];

  document.documentElement.lang = language;
  title.textContent = strings.title;
  masterLabel.textContent = strings.master;
  adsLabel.textContent = strings.network;
  privacyLabel.textContent = strings.privacy;
  privacyDescription.textContent = strings.privacyDescription;
  phishingLabel.textContent = strings.phishing;
  phishingDescription.textContent = strings.phishingDescription;
  secureNavigationLabel.textContent = strings.secureNavigation;
  secureNavigationDescription.textContent = strings.secureNavigationDescription;
  cosmeticTitle.textContent = strings.cosmeticTitle;
  cosmeticLabel.textContent = strings.cosmeticLabel;
  cosmeticDescription.textContent = strings.cosmeticDescription;
  cosmeticReload.textContent = strings.cosmeticReload;
  contentTitle.textContent = strings.contentTitle;
  contentMasterLabel.textContent = strings.contentMaster;
  contentDescription.textContent = strings.contentDescription;
  contentReload.textContent = strings.contentReload;
  allowlistTitle.textContent = strings.allowlistTitle;
  allowlistDescription.textContent = strings.allowlistDescription;
  contentAllowlistTitle.textContent = strings.contentAllowlistTitle;
  contentAllowlistDescription.textContent = strings.contentAllowlistDescription;
  blockedTitle.textContent = strings.blockedTitle;
  blockedDescription.textContent = strings.blockedDescription;
  addButton.textContent = strings.add;
  contentAllowlistAdd.textContent = strings.add;
  blockedAdd.textContent = strings.add;

  categoryLabels.gambling.textContent = strings.gambling;
  categoryLabels.explicit.textContent = strings.explicit;
  categoryLabels.violence.textContent = strings.violence;
  categoryLabels.scam.textContent = strings.scam;
  categoryLabels.clickbait.textContent = strings.clickbait;

  const autoOption = languageSelect.querySelector<HTMLOptionElement>('option[value="auto"]');
  if (autoOption) autoOption.textContent = strings.auto;
  languageSelect.value = settings.language;
}

function optionsRenderDomainList(
  target: HTMLUListElement,
  domains: string[],
  onRemove: (domain: string) => void
): void {
  const strings = optionsStrings(settings);
  target.replaceChildren();

  for (const domain of domains) {
    const item = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = domain;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = strings.remove;
    remove.addEventListener("click", () => onRemove(domain));

    item.append(label, remove);
    target.append(item);
  }
}

function renderAllowlist(): void {
  optionsRenderDomainList(list, settings.allowlist, (domain) => {
    void updateAllowlist(settings.allowlist.filter((entry) => entry !== domain));
  });
}

function renderContentAllowlist(): void {
  optionsRenderDomainList(contentAllowlistList, settings.contentAllowlist, (domain) => {
    void updateContentAllowlist(settings.contentAllowlist.filter((entry) => entry !== domain));
  });
}

function renderBlockedDomains(): void {
  optionsRenderDomainList(blockedList, settings.blockedDomains, (domain) => {
    void updateBlockedDomains(settings.blockedDomains.filter((entry) => entry !== domain));
  });
}

function renderCategories(): void {
  for (const category of Object.keys(categoryCheckboxes) as OptionsContentCategory[]) {
    categoryCheckboxes[category].checked = settings.contentCategories[category];
  }
}

async function persist(): Promise<void> {
  await optionsSaveSettings(settings);
  await optionsApplySettings(settings);
}

async function updateAllowlist(next: string[]): Promise<void> {
  settings.allowlist = next;
  await persist();
  renderAllowlist();
  message.textContent = optionsStrings(settings).allowlistUpdated;
}

async function updateContentAllowlist(next: string[]): Promise<void> {
  settings.contentAllowlist = next;
  await optionsSaveSettings(settings);
  await optionsApplyContentFilter(settings);
  renderContentAllowlist();
  contentMessage.textContent = optionsStrings(settings).contentAllowlistUpdated;
}

async function updateBlockedDomains(next: string[]): Promise<void> {
  settings.blockedDomains = next;
  await optionsSaveSettings(settings);
  await optionsSyncBlockedDomainRules(next);
  renderBlockedDomains();
  blockedMessage.textContent = optionsStrings(settings).blockedUpdated;
}

master.addEventListener("change", () => {
  settings.enabled = master.checked;
  void persist().then(() => {
    message.textContent = optionsStrings(settings).protectionUpdated;
  }).catch((error) => {
    message.textContent = error instanceof Error ? error.message : "Could not update protection.";
  });
});

ads.addEventListener("change", () => {
  settings.adsEnabled = ads.checked;
  void persist().then(() => {
    message.textContent = optionsStrings(settings).networkUpdated;
  }).catch((error) => {
    message.textContent = error instanceof Error ? error.message : "Could not update network ad blocking.";
  });
});

privacy.addEventListener("change", () => {
  settings.privacyEnabled = privacy.checked;
  void persist().then(() => {
    message.textContent = optionsStrings(settings).privacyUpdated;
  }).catch((error) => {
    message.textContent = error instanceof Error ? error.message : "Could not update privacy blocking.";
  });
});

phishing.addEventListener("change", () => {
  settings.phishingEnabled = phishing.checked;
  void persist().then(() => {
    message.textContent = optionsStrings(settings).phishingUpdated;
  }).catch((error) => {
    message.textContent = error instanceof Error ? error.message : "Could not update phishing blocking.";
  });
});

secureNavigation.addEventListener("change", () => {
  secureNavigation.disabled = true;

  if (secureNavigation.checked) {
    void optionsHostPermissionRequest().then(async (granted) => {
      if (!granted) {
        secureNavigation.checked = false;
        settings.secureNavigationEnabled = false;
        await optionsSaveSettings(settings);
        message.textContent = optionsStrings(settings).permissionDenied;
        return;
      }

      settings.secureNavigationEnabled = true;
      await optionsSaveSettings(settings);
      await optionsSyncHttpsUpgradeRule(settings.enabled);
      message.textContent = optionsStrings(settings).secureNavigationUpdated;
    }).catch((error) => {
      secureNavigation.checked = false;
      settings.secureNavigationEnabled = false;
      message.textContent =
        error instanceof Error ? error.message : "Could not enable HTTPS navigation upgrade.";
    }).finally(() => {
      secureNavigation.disabled = false;
    });
    return;
  }

  settings.secureNavigationEnabled = false;
  void optionsSaveSettings(settings).then(async () => {
    await optionsSyncHttpsUpgradeRule(false);
    await optionsMaybeRemoveSiteAccess(settings);
    message.textContent = optionsStrings(settings).secureNavigationUpdated;
  }).catch((error) => {
    secureNavigation.checked = true;
    settings.secureNavigationEnabled = true;
    message.textContent =
      error instanceof Error ? error.message : "Could not disable HTTPS navigation upgrade.";
  }).finally(() => {
    secureNavigation.disabled = false;
  });
});

cosmetic.addEventListener("change", () => {
  cosmetic.disabled = true;

  if (cosmetic.checked) {
    void optionsPermissionRequest().then(async (granted) => {
      if (!granted) {
        cosmetic.checked = false;
        settings.cosmeticEnabled = false;
        await optionsSaveSettings(settings);
        message.textContent = optionsStrings(settings).permissionDenied;
        return;
      }

      settings.cosmeticEnabled = true;
      await optionsSaveSettings(settings);
      await optionsApplyCosmetic(settings);
      message.textContent = optionsStrings(settings).cosmeticEnabled;
    }).catch((error) => {
      cosmetic.checked = false;
      settings.cosmeticEnabled = false;
      message.textContent = error instanceof Error ? error.message : "Could not enable page ad cleanup.";
    }).finally(() => {
      cosmetic.disabled = false;
    });
    return;
  }

  settings.cosmeticEnabled = false;
  void optionsSaveSettings(settings).then(async () => {
    await optionsApplyCosmetic(settings);
    await optionsMaybeRemoveSiteAccess(settings);
    message.textContent = optionsStrings(settings).cosmeticDisabled;
  }).catch((error) => {
    cosmetic.checked = true;
    settings.cosmeticEnabled = true;
    message.textContent = error instanceof Error ? error.message : "Could not disable page ad cleanup.";
  }).finally(() => {
    cosmetic.disabled = false;
  });
});

contentEnabled.addEventListener("change", () => {
  contentEnabled.disabled = true;

  if (contentEnabled.checked) {
    if (!optionsHasSelectedContentCategory(settings)) {
      contentEnabled.checked = false;
      settings.contentEnabled = false;
      contentMessage.textContent = optionsStrings(settings).contentSelectCategory;
      contentEnabled.disabled = false;
      return;
    }

    void optionsPermissionRequest().then(async (granted) => {
      if (!granted) {
        contentEnabled.checked = false;
        settings.contentEnabled = false;
        await optionsSaveSettings(settings);
        contentMessage.textContent = optionsStrings(settings).permissionDenied;
        return;
      }

      settings.contentEnabled = true;
      await optionsSaveSettings(settings);
      await optionsApplyContentFilter(settings);
      contentMessage.textContent = optionsStrings(settings).contentEnabled;
    }).catch((error) => {
      contentEnabled.checked = false;
      settings.contentEnabled = false;
      contentMessage.textContent = error instanceof Error ? error.message : "Could not enable content filtering.";
    }).finally(() => {
      contentEnabled.disabled = false;
    });
    return;
  }

  settings.contentEnabled = false;
  void optionsSaveSettings(settings).then(async () => {
    await optionsApplyContentFilter(settings);
    await optionsMaybeRemoveSiteAccess(settings);
    contentMessage.textContent = optionsStrings(settings).contentDisabled;
  }).catch((error) => {
    contentEnabled.checked = true;
    settings.contentEnabled = true;
    contentMessage.textContent = error instanceof Error ? error.message : "Could not disable content filtering.";
  }).finally(() => {
    contentEnabled.disabled = false;
  });
});

for (const category of Object.keys(categoryCheckboxes) as OptionsContentCategory[]) {
  categoryCheckboxes[category].addEventListener("change", () => {
    settings.contentCategories[category] = categoryCheckboxes[category].checked;

    if (settings.contentEnabled && !optionsHasSelectedContentCategory(settings)) {
      settings.contentEnabled = false;
      contentEnabled.checked = false;
    }

    void optionsSaveSettings(settings).then(async () => {
      await optionsApplyContentFilter(settings);
      await optionsMaybeRemoveSiteAccess(settings);
      contentMessage.textContent = optionsStrings(settings).categoriesUpdated;
    }).catch((error) => {
      contentMessage.textContent = error instanceof Error ? error.message : "Could not update categories.";
    });
  });
}

languageSelect.addEventListener("change", () => {
  settings.language = optionsSanitizeLanguage(languageSelect.value);
  void optionsSaveSettings(settings).then(() => {
    optionsApplyTranslations();
    renderAllowlist();
    renderContentAllowlist();
  }).catch((error) => {
    message.textContent = error instanceof Error ? error.message : "Could not update language.";
  });
});

addButton.addEventListener("click", () => {
  const strings = optionsStrings(settings);
  try {
    const domain = optionsNormalizeDomain(input.value, strings);
    if (settings.allowlist.includes(domain)) {
      message.textContent = strings.duplicate;
      return;
    }
    input.value = "";
    void updateAllowlist([...settings.allowlist, domain]).catch((error) => {
      message.textContent = error instanceof Error ? error.message : "Could not update allowlist.";
    });
  } catch (error) {
    message.textContent = error instanceof Error ? error.message : strings.invalid;
  }
});

blockedAdd.addEventListener("click", () => {
  const strings = optionsStrings(settings);
  try {
    const domain = optionsNormalizeDomain(blockedInput.value, strings);
    if (settings.blockedDomains.includes(domain)) {
      blockedMessage.textContent = strings.duplicate;
      return;
    }
    blockedInput.value = "";
    void updateBlockedDomains([...settings.blockedDomains, domain]).catch((error) => {
      blockedMessage.textContent =
        error instanceof Error ? error.message : "Could not update dangerous-site block list.";
    });
  } catch (error) {
    blockedMessage.textContent = error instanceof Error ? error.message : strings.invalid;
  }
});

contentAllowlistAdd.addEventListener("click", () => {
  const strings = optionsStrings(settings);
  try {
    const domain = optionsNormalizeDomain(contentAllowlistInput.value, strings);
    if (settings.contentAllowlist.includes(domain)) {
      contentMessage.textContent = strings.duplicate;
      return;
    }
    contentAllowlistInput.value = "";
    void updateContentAllowlist([...settings.contentAllowlist, domain]).catch((error) => {
      contentMessage.textContent =
        error instanceof Error ? error.message : "Could not update content exceptions.";
    });
  } catch (error) {
    contentMessage.textContent = error instanceof Error ? error.message : strings.invalid;
  }
});

void optionsLoadSettings().then(async (loaded) => {
  settings = loaded;

  const permissionGranted = await optionsPermissionContains();
  const hostPermissionGranted = await optionsHostPermissionContains();
  if (!permissionGranted && (settings.cosmeticEnabled || settings.contentEnabled)) {
    settings.cosmeticEnabled = false;
    settings.contentEnabled = false;
    await optionsSaveSettings(settings);
  }
  if (!hostPermissionGranted && settings.secureNavigationEnabled) {
    settings.secureNavigationEnabled = false;
    await optionsSaveSettings(settings);
  }

  master.checked = settings.enabled;
  ads.checked = settings.adsEnabled;
  privacy.checked = settings.privacyEnabled;
  phishing.checked = settings.phishingEnabled;
  secureNavigation.checked = settings.secureNavigationEnabled;
  cosmetic.checked = settings.cosmeticEnabled;
  contentEnabled.checked = settings.contentEnabled;
  renderCategories();

  optionsApplyTranslations();
  renderAllowlist();
  renderContentAllowlist();
  renderBlockedDomains();
  await optionsApplyProtection(settings);
  await optionsSyncBlockedDomainRules(settings.blockedDomains);
  await optionsSyncHttpsUpgradeRule(settings.enabled && settings.secureNavigationEnabled);

  if (permissionGranted) {
    await optionsApplyCosmetic(settings);
    await optionsApplyContentFilter(settings);
  }

  for (const element of [
    master,
    ads,
    privacy,
    phishing,
    secureNavigation,
    cosmetic,
    contentEnabled,
    input,
    addButton,
    contentAllowlistInput,
    contentAllowlistAdd,
    blockedInput,
    blockedAdd,
    languageSelect,
    ...Object.values(categoryCheckboxes)
  ]) {
    element.disabled = false;
  }
}).catch((error) => {
  message.textContent = error instanceof Error ? error.message : "Could not load settings.";
});
