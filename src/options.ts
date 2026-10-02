type OptionsLanguagePreference = "auto" | "zh-CN" | "en";
type OptionsResolvedLanguage = "zh-CN" | "en";

interface OptionsSettings {
  enabled: boolean;
  adsEnabled: boolean;
  cosmeticEnabled: boolean;
  language: OptionsLanguagePreference;
  allowlist: string[];
}

const OPTIONS_STORAGE_KEY = "jammerSettings";
const OPTIONS_ADS_RULESET_ID = "ads_static";
const OPTIONS_ALLOWLIST_RULE_ID_BASE = 1_000_000;
const OPTIONS_ALLOWLIST_RULE_ID_LIMIT = 1_999_999;
const OPTIONS_COSMETIC_SCRIPT_ID = "jammer-cosmetic-css";
const OPTIONS_COSMETIC_SITE_SCRIPT_ID = "jammer-cosmetic-canyoublockit";
const OPTIONS_COSMETIC_ORIGINS = ["http://*/*", "https://*/*"];

const OPTIONS_DEFAULT_SETTINGS: OptionsSettings = {
  enabled: true,
  adsEnabled: true,
  cosmeticEnabled: false,
  language: "auto",
  allowlist: []
};

const OPTIONS_STRINGS: Record<OptionsResolvedLanguage, Record<string, string>> = {
  en: {
    title: "Jammer Options",
    master: "Jammer protection",
    network: "Network ad blocking",
    cosmeticTitle: "Page ad cleanup",
    cosmeticLabel: "Hide page ad containers",
    cosmeticDescription: "Optional. When enabled, Edge asks for website access so Jammer can inject CSS-only ad hiding. Jammer does not read page text, forms, or passwords.",
    cosmeticReload: "Reload open pages after changing this setting. Allowlisted sites are excluded.",
    allowlistTitle: "Allowlist",
    allowlistDescription: "Enter a domain manually. Jammer does not read the current tab.",
    add: "Add",
    remove: "Remove",
    contentTitle: "Content filtering",
    contentDescription: "Semantic page-content filtering is not implemented. Jammer only hides explicit ad containers with CSS.",
    auto: "Auto",
    permissionDenied: "Website access was not granted. Page ad cleanup remains off.",
    cosmeticEnabled: "Page ad cleanup enabled. Reload open pages.",
    cosmeticDisabled: "Page ad cleanup disabled and website access removed.",
    protectionUpdated: "Protection setting updated. Reload open pages for cosmetic changes.",
    networkUpdated: "Network ad blocking updated.",
    allowlistUpdated: "Allowlist updated. Reload open pages for cosmetic changes.",
    duplicate: "That domain is already allowlisted.",
    invalid: "Enter a valid domain.",
    fullyQualified: "Enter a fully qualified domain.",
    httpOnly: "Only http/https domains are supported.",
    credentials: "Credentials are not allowed in allowlist entries."
  },
  "zh-CN": {
    title: "Jammer 设置",
    master: "Jammer 总保护",
    network: "网络广告拦截",
    cosmeticTitle: "页面广告清理",
    cosmeticLabel: "隐藏页面广告容器",
    cosmeticDescription: "可选功能。启用后，Edge 会请求网站访问权限，以便 Jammer 仅注入 CSS 隐藏广告。Jammer 不读取网页正文、表单或密码。",
    cosmeticReload: "修改后请刷新已打开页面。白名单网站不会注入页面广告清理 CSS。",
    allowlistTitle: "白名单",
    allowlistDescription: "手动输入域名。Jammer 不读取当前标签页。",
    add: "添加",
    remove: "删除",
    contentTitle: "内容过滤",
    contentDescription: "尚未实现语义内容过滤。当前只通过 CSS 隐藏明确的广告容器。",
    auto: "自动",
    permissionDenied: "未授予网站访问权限，页面广告清理保持关闭。",
    cosmeticEnabled: "页面广告清理已启用，请刷新已打开页面。",
    cosmeticDisabled: "页面广告清理已关闭，并已撤销网站访问权限。",
    protectionUpdated: "总保护设置已更新。页面广告清理变化需刷新已打开页面。",
    networkUpdated: "网络广告拦截设置已更新。",
    allowlistUpdated: "白名单已更新。页面广告清理变化需刷新已打开页面。",
    duplicate: "该域名已在白名单中。",
    invalid: "请输入有效域名。",
    fullyQualified: "请输入完整域名。",
    httpOnly: "仅支持 http/https 域名。",
    credentials: "白名单条目中不允许包含账号凭据。"
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

function optionsGetRegisteredCosmetic(): Promise<JammerContentScript[]> {
  return new Promise((resolve, reject) => {
    chrome.scripting.getRegisteredContentScripts(
      { ids: [OPTIONS_COSMETIC_SCRIPT_ID, OPTIONS_COSMETIC_SITE_SCRIPT_ID] },
      (scripts) => {
        if (chrome.runtime.lastError) {
          reject(optionsRuntimeError("Cosmetic registration read failed"));
          return;
        }
        resolve(scripts);
      }
    );
  });
}

function optionsRegisterContentScript(script: JammerContentScript): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.scripting.registerContentScripts([script], () => {
      if (chrome.runtime.lastError) {
        reject(optionsRuntimeError("Cosmetic registration failed"));
        return;
      }
      resolve();
    });
  });
}

function optionsUnregisterContentScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.scripting.unregisterContentScripts(
      { ids: [OPTIONS_COSMETIC_SCRIPT_ID, OPTIONS_COSMETIC_SITE_SCRIPT_ID] },
      () => {
        if (chrome.runtime.lastError) {
          reject(optionsRuntimeError("Cosmetic unregister failed"));
          return;
        }
        resolve();
      }
    );
  });
}

async function optionsUnregisterCosmeticIfPresent(): Promise<void> {
  const granted = await optionsPermissionContains();
  if (!granted) return;
  const existing = await optionsGetRegisteredCosmetic();
  if (existing.length === 0) return;
  await optionsUnregisterContentScript();
}

function optionsAllowlistExcludeMatches(domains: string[]): string[] {
  return domains.flatMap((domain) => {
    const exact = `*://${domain}/*`;
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(domain)) return [exact];
    return [exact, `*://*.${domain}/*`];
  });
}

async function optionsApplyCosmetic(settings: OptionsSettings): Promise<void> {
  const granted = await optionsPermissionContains();

  if (!settings.enabled || !settings.cosmeticEnabled || !granted) {
    if (granted) await optionsUnregisterCosmeticIfPresent();
    return;
  }

  await optionsUnregisterCosmeticIfPresent();
  await optionsRegisterContentScript({
    id: OPTIONS_COSMETIC_SCRIPT_ID,
    matches: OPTIONS_COSMETIC_ORIGINS,
    excludeMatches: optionsAllowlistExcludeMatches(settings.allowlist),
    css: ["cosmetic.css", "cosmetic-easylist.css"],
    runAt: "document_start",
    allFrames: true,
    persistAcrossSessions: true
  });
  await optionsRegisterContentScript({
    id: OPTIONS_COSMETIC_SITE_SCRIPT_ID,
    matches: ["*://canyoublockit.com/*", "*://*.canyoublockit.com/*"],
    excludeMatches: optionsAllowlistExcludeMatches(settings.allowlist),
    css: ["cosmetic-canyoublockit.css"],
    runAt: "document_start",
    allFrames: true,
    persistAcrossSessions: true
  });
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
  if (!value || typeof value !== "object") return { ...OPTIONS_DEFAULT_SETTINGS };
  const candidate = value as Partial<OptionsSettings>;
  return {
    enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : true,
    adsEnabled: typeof candidate.adsEnabled === "boolean" ? candidate.adsEnabled : true,
    cosmeticEnabled: typeof candidate.cosmeticEnabled === "boolean" ? candidate.cosmeticEnabled : false,
    language: optionsSanitizeLanguage(candidate.language),
    allowlist: Array.isArray(candidate.allowlist)
      ? candidate.allowlist.filter((item): item is string => typeof item === "string")
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

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(strings.httpOnly);
  }
  if (url.username || url.password) {
    throw new Error(strings.credentials);
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || hostname.length > 253 || !hostname.includes(".")) {
    throw new Error(strings.fullyQualified);
  }

  const labels = hostname.split(".");
  if (labels.some((label) => !OPTIONS_LABEL_RE.test(label))) {
    throw new Error(strings.invalid);
  }

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
  const shouldEnable = settings.enabled && settings.adsEnabled;
  const enabled = await optionsGetEnabledRulesets();
  const isEnabled = enabled.includes(OPTIONS_ADS_RULESET_ID);
  if (shouldEnable === isEnabled) return;

  await optionsUpdateEnabledRulesets(
    shouldEnable
      ? { enableRulesetIds: [OPTIONS_ADS_RULESET_ID] }
      : { disableRulesetIds: [OPTIONS_ADS_RULESET_ID] }
  );
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

async function optionsApplySettings(settings: OptionsSettings): Promise<void> {
  await optionsApplyProtection(settings);
  await optionsSyncAllowlistRules(settings.allowlist);
  await optionsApplyCosmetic(settings);
}

const title = optionsRequireElement<HTMLElement>("#options-title");
const master = optionsRequireElement<HTMLInputElement>("#master-enabled");
const ads = optionsRequireElement<HTMLInputElement>("#ads-enabled");
const cosmetic = optionsRequireElement<HTMLInputElement>("#cosmetic-enabled");
const masterLabel = optionsRequireElement<HTMLElement>("#master-label");
const adsLabel = optionsRequireElement<HTMLElement>("#ads-label");
const cosmeticTitle = optionsRequireElement<HTMLElement>("#cosmetic-title");
const cosmeticLabel = optionsRequireElement<HTMLElement>("#cosmetic-label");
const cosmeticDescription = optionsRequireElement<HTMLElement>("#cosmetic-description");
const cosmeticReload = optionsRequireElement<HTMLElement>("#cosmetic-reload");
const allowlistTitle = optionsRequireElement<HTMLElement>("#allowlist-title");
const allowlistDescription = optionsRequireElement<HTMLElement>("#allowlist-description");
const input = optionsRequireElement<HTMLInputElement>("#allowlist-input");
const addButton = optionsRequireElement<HTMLButtonElement>("#add-domain");
const list = optionsRequireElement<HTMLUListElement>("#allowlist");
const message = optionsRequireElement<HTMLElement>("#message");
const contentTitle = optionsRequireElement<HTMLElement>("#content-title");
const contentDescription = optionsRequireElement<HTMLElement>("#content-description");
const languageSelect = optionsRequireElement<HTMLSelectElement>("#language-select");

master.disabled = true;
ads.disabled = true;
cosmetic.disabled = true;
input.disabled = true;
addButton.disabled = true;
languageSelect.disabled = true;

let settings: OptionsSettings = { ...OPTIONS_DEFAULT_SETTINGS };

function optionsApplyTranslations(): void {
  const language = optionsResolveLanguage(settings.language);
  const strings = OPTIONS_STRINGS[language];

  document.documentElement.lang = language;
  title.textContent = strings.title;
  masterLabel.textContent = strings.master;
  adsLabel.textContent = strings.network;
  cosmeticTitle.textContent = strings.cosmeticTitle;
  cosmeticLabel.textContent = strings.cosmeticLabel;
  cosmeticDescription.textContent = strings.cosmeticDescription;
  cosmeticReload.textContent = strings.cosmeticReload;
  allowlistTitle.textContent = strings.allowlistTitle;
  allowlistDescription.textContent = strings.allowlistDescription;
  addButton.textContent = strings.add;
  contentTitle.textContent = strings.contentTitle;
  contentDescription.textContent = strings.contentDescription;

  const autoOption = languageSelect.querySelector<HTMLOptionElement>('option[value="auto"]');
  if (autoOption) autoOption.textContent = strings.auto;

  languageSelect.value = settings.language;
}

function renderAllowlist(): void {
  const strings = optionsStrings(settings);
  list.replaceChildren();

  for (const domain of settings.allowlist) {
    const item = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = domain;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = strings.remove;
    remove.addEventListener("click", () => {
      void updateAllowlist(settings.allowlist.filter((entry) => entry !== domain));
    });

    item.append(label, remove);
    list.append(item);
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
      try {
        await optionsSaveSettings(settings);
        await optionsApplyCosmetic(settings);
        message.textContent = optionsStrings(settings).cosmeticEnabled;
      } catch (error) {
        settings.cosmeticEnabled = false;
        cosmetic.checked = false;
        await optionsSaveSettings(settings);
        await optionsUnregisterCosmeticIfPresent().catch(() => undefined);
        await optionsPermissionRemove().catch(() => false);
        message.textContent = error instanceof Error ? error.message : "Could not enable page ad cleanup.";
      }
    }).catch((error) => {
      cosmetic.checked = false;
      message.textContent = error instanceof Error ? error.message : "Could not request website access.";
    }).finally(() => {
      cosmetic.disabled = false;
    });
    return;
  }

  settings.cosmeticEnabled = false;
  void optionsSaveSettings(settings).then(async () => {
    await optionsUnregisterCosmeticIfPresent();
    await optionsPermissionRemove();
    message.textContent = optionsStrings(settings).cosmeticDisabled;
  }).catch((error) => {
    cosmetic.checked = true;
    settings.cosmeticEnabled = true;
    message.textContent = error instanceof Error ? error.message : "Could not disable page ad cleanup.";
  }).finally(() => {
    cosmetic.disabled = false;
  });
});

languageSelect.addEventListener("change", () => {
  settings.language = optionsSanitizeLanguage(languageSelect.value);
  void optionsSaveSettings(settings).then(() => {
    optionsApplyTranslations();
    renderAllowlist();
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

void optionsLoadSettings().then(async (loaded) => {
  settings = loaded;

  const permissionGranted = await optionsPermissionContains();
  if (settings.cosmeticEnabled && !permissionGranted) {
    settings.cosmeticEnabled = false;
    await optionsSaveSettings(settings);
  }

  master.checked = settings.enabled;
  ads.checked = settings.adsEnabled;
  cosmetic.checked = settings.cosmeticEnabled;

  optionsApplyTranslations();
  renderAllowlist();

  if (permissionGranted) {
    await optionsApplyCosmetic(settings);
  }

  master.disabled = false;
  ads.disabled = false;
  cosmetic.disabled = false;
  input.disabled = false;
  addButton.disabled = false;
  languageSelect.disabled = false;
}).catch((error) => {
  message.textContent = error instanceof Error ? error.message : "Could not load settings.";
});
