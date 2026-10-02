type PopupLanguagePreference = "auto" | "zh-CN" | "en";
type PopupResolvedLanguage = "zh-CN" | "en";
type PopupContentCategory = "gambling" | "explicit" | "violence" | "scam" | "clickbait";
type PopupContentCategories = Record<PopupContentCategory, boolean>;

interface PopupSettings {
  enabled: boolean;
  adsEnabled: boolean;
  cosmeticEnabled: boolean;
  contentEnabled: boolean;
  contentCategories: PopupContentCategories;
  language: PopupLanguagePreference;
  allowlist: string[];
  contentAllowlist: string[];
}

const POPUP_STORAGE_KEY = "jammerSettings";
const POPUP_ADS_RULESET_ID = "ads_static";
const POPUP_COSMETIC_SCRIPT_ID = "jammer-cosmetic-css";
const POPUP_COSMETIC_SITE_SCRIPT_ID = "jammer-cosmetic-canyoublockit";
const POPUP_CONTENT_SCRIPT_ID = "jammer-content-filter";
const POPUP_SITE_ORIGINS = ["http://*/*", "https://*/*"];

const POPUP_DEFAULT_CATEGORIES: PopupContentCategories = {
  gambling: false,
  explicit: false,
  violence: false,
  scam: false,
  clickbait: false
};

const POPUP_DEFAULT_SETTINGS: PopupSettings = {
  enabled: true,
  adsEnabled: true,
  cosmeticEnabled: false,
  contentEnabled: false,
  contentCategories: { ...POPUP_DEFAULT_CATEGORIES },
  language: "auto",
  allowlist: [],
  contentAllowlist: []
};

const POPUP_STRINGS: Record<PopupResolvedLanguage, Record<string, string>> = {
  en: {
    protection: "Protection",
    enabled: "Enabled",
    disabled: "Disabled",
    cosmetic: "Page ad cleanup",
    cosmeticHint: "Hide explicit ad containers. Enabling requires website access.",
    cosmeticOn: "Page ad cleanup is on.",
    cosmeticOff: "Page ad cleanup is off.",
    content: "Content filtering",
    contentHint: "Warn on selected categories with local text matching.",
    contentOn: "Content filtering is on.",
    contentOff: "Content filtering is off.",
    contentNoCategories: "Choose at least one category in Options first.",
    permissionDenied: "Website access was not granted.",
    cosmeticEnabled: "Page ad cleanup enabled. Reload open pages.",
    cosmeticDisabled: "Page ad cleanup disabled.",
    contentEnabled: "Content filtering enabled. Reload already-open pages once.",
    contentDisabled: "Content filtering disabled.",
    options: "Options",
    languageAuto: "Auto"
  },
  "zh-CN": {
    protection: "总保护",
    enabled: "已启用",
    disabled: "已停用",
    cosmetic: "页面广告清理",
    cosmeticHint: "隐藏明确的页面广告容器。启用时需要网站访问权限。",
    cosmeticOn: "页面广告清理已开启。",
    cosmeticOff: "页面广告清理已关闭。",
    content: "内容过滤",
    contentHint: "使用本地文本匹配，对所选内容类别显示警告。",
    contentOn: "内容过滤已开启。",
    contentOff: "内容过滤已关闭。",
    contentNoCategories: "请先在设置中至少选择一个内容类别。",
    permissionDenied: "未授予网站访问权限。",
    cosmeticEnabled: "页面广告清理已启用，请刷新已打开页面。",
    cosmeticDisabled: "页面广告清理已关闭。",
    contentEnabled: "内容过滤已启用。请把已打开页面刷新一次。",
    contentDisabled: "内容过滤已关闭。",
    options: "设置",
    languageAuto: "自动"
  }
};

function popupRequireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}

function popupRuntimeError(prefix: string): Error {
  const message = chrome.runtime.lastError?.message;
  return new Error(message ? `${prefix}: ${message}` : prefix);
}

function popupStorageGet(key: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, (items) => {
      if (chrome.runtime.lastError) {
        reject(popupRuntimeError("Storage read failed"));
        return;
      }
      resolve(items);
    });
  });
}

function popupStorageSet(items: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(popupRuntimeError("Storage write failed"));
        return;
      }
      resolve();
    });
  });
}

function popupPermissionContains(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.permissions.contains(
      { permissions: ["scripting"], origins: POPUP_SITE_ORIGINS },
      (result) => {
        if (chrome.runtime.lastError) {
          reject(popupRuntimeError("Permission check failed"));
          return;
        }
        resolve(result);
      }
    );
  });
}

function popupPermissionRequest(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.permissions.request(
      { permissions: ["scripting"], origins: POPUP_SITE_ORIGINS },
      (granted) => {
        if (chrome.runtime.lastError) {
          reject(popupRuntimeError("Permission request failed"));
          return;
        }
        resolve(granted);
      }
    );
  });
}

function popupPermissionRemove(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    chrome.permissions.remove(
      { permissions: ["scripting"], origins: POPUP_SITE_ORIGINS },
      (removed) => {
        if (chrome.runtime.lastError) {
          reject(popupRuntimeError("Permission removal failed"));
          return;
        }
        resolve(removed);
      }
    );
  });
}

function popupGetRegisteredScripts(ids: string[]): Promise<JammerContentScript[]> {
  return new Promise((resolve, reject) => {
    chrome.scripting.getRegisteredContentScripts({ ids }, (scripts) => {
      if (chrome.runtime.lastError) {
        reject(popupRuntimeError("Registered content-script read failed"));
        return;
      }
      resolve(scripts);
    });
  });
}

function popupRegisterScripts(scripts: JammerContentScript[]): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.scripting.registerContentScripts(scripts, () => {
      if (chrome.runtime.lastError) {
        reject(popupRuntimeError("Content-script registration failed"));
        return;
      }
      resolve();
    });
  });
}

function popupUnregisterScripts(ids: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.scripting.unregisterContentScripts({ ids }, () => {
      if (chrome.runtime.lastError) {
        reject(popupRuntimeError("Content-script unregister failed"));
        return;
      }
      resolve();
    });
  });
}

async function popupUnregisterIfPresent(ids: string[]): Promise<void> {
  const granted = await popupPermissionContains();
  if (!granted) return;
  const existing = await popupGetRegisteredScripts(ids);
  if (existing.length > 0) await popupUnregisterScripts(existing.map((item) => item.id));
}

function popupDomainExcludeMatches(domains: string[]): string[] {
  return domains.flatMap((domain) => {
    const exact = `*://${domain}/*`;
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(domain)) return [exact];
    return [exact, `*://*.${domain}/*`];
  });
}

function popupHasSelectedCategory(settings: PopupSettings): boolean {
  return Object.values(settings.contentCategories).some(Boolean);
}

async function popupApplyCosmetic(settings: PopupSettings): Promise<void> {
  const granted = await popupPermissionContains();
  const ids = [POPUP_COSMETIC_SCRIPT_ID, POPUP_COSMETIC_SITE_SCRIPT_ID];
  const shouldEnable = settings.enabled && settings.cosmeticEnabled && granted;

  if (!shouldEnable) {
    if (granted) await popupUnregisterIfPresent(ids);
    return;
  }

  await popupUnregisterIfPresent(ids);
  await popupRegisterScripts([
    {
      id: POPUP_COSMETIC_SCRIPT_ID,
      matches: POPUP_SITE_ORIGINS,
      excludeMatches: popupDomainExcludeMatches(settings.allowlist),
      css: ["cosmetic.css", "cosmetic-easylist.css"],
      runAt: "document_start",
      allFrames: true,
      persistAcrossSessions: true
    },
    {
      id: POPUP_COSMETIC_SITE_SCRIPT_ID,
      matches: ["*://canyoublockit.com/*", "*://*.canyoublockit.com/*"],
      excludeMatches: popupDomainExcludeMatches(settings.allowlist),
      css: ["cosmetic-canyoublockit.css", "cosmetic-canyoublockit-local.css"],
      runAt: "document_start",
      allFrames: true,
      persistAcrossSessions: true
    }
  ]);
}

async function popupApplyContentFilter(settings: PopupSettings): Promise<void> {
  const granted = await popupPermissionContains();
  const shouldEnable =
    settings.enabled &&
    settings.contentEnabled &&
    popupHasSelectedCategory(settings) &&
    granted;

  if (!shouldEnable) {
    if (granted) await popupUnregisterIfPresent([POPUP_CONTENT_SCRIPT_ID]);
    return;
  }

  await popupUnregisterIfPresent([POPUP_CONTENT_SCRIPT_ID]);
  await popupRegisterScripts([
    {
      id: POPUP_CONTENT_SCRIPT_ID,
      matches: POPUP_SITE_ORIGINS,
      excludeMatches: popupDomainExcludeMatches(settings.contentAllowlist),
      js: ["content-classifier.js", "content-filter.js"],
      runAt: "document_idle",
      allFrames: false,
      persistAcrossSessions: true
    }
  ]);
}

async function popupMaybeRemoveSiteAccess(settings: PopupSettings): Promise<void> {
  if (settings.cosmeticEnabled || settings.contentEnabled) return;
  const granted = await popupPermissionContains();
  if (granted) await popupPermissionRemove();
}

function popupGetEnabledRulesets(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    chrome.declarativeNetRequest.getEnabledRulesets((rulesets) => {
      if (chrome.runtime.lastError) {
        reject(popupRuntimeError("Ruleset read failed"));
        return;
      }
      resolve(rulesets);
    });
  });
}

function popupUpdateEnabledRulesets(options: {
  enableRulesetIds?: string[];
  disableRulesetIds?: string[];
}): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.declarativeNetRequest.updateEnabledRulesets(options, () => {
      if (chrome.runtime.lastError) {
        reject(popupRuntimeError("Ruleset update failed"));
        return;
      }
      resolve();
    });
  });
}

function popupSanitizeLanguage(value: unknown): PopupLanguagePreference {
  return value === "zh-CN" || value === "en" || value === "auto" ? value : "auto";
}

function popupSanitizeSettings(value: unknown): PopupSettings {
  if (!value || typeof value !== "object") {
    return {
      ...POPUP_DEFAULT_SETTINGS,
      contentCategories: { ...POPUP_DEFAULT_CATEGORIES }
    };
  }

  const candidate = value as Partial<PopupSettings>;
  const categories =
    candidate.contentCategories && typeof candidate.contentCategories === "object"
      ? candidate.contentCategories as Partial<PopupContentCategories>
      : {};

  return {
    enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : true,
    adsEnabled: typeof candidate.adsEnabled === "boolean" ? candidate.adsEnabled : true,
    cosmeticEnabled: typeof candidate.cosmeticEnabled === "boolean" ? candidate.cosmeticEnabled : false,
    contentEnabled: typeof candidate.contentEnabled === "boolean" ? candidate.contentEnabled : false,
    contentCategories: {
      gambling: categories.gambling === true,
      explicit: categories.explicit === true,
      violence: categories.violence === true,
      scam: categories.scam === true,
      clickbait: categories.clickbait === true
    },
    language: popupSanitizeLanguage(candidate.language),
    allowlist: Array.isArray(candidate.allowlist)
      ? candidate.allowlist.filter((item): item is string => typeof item === "string")
      : [],
    contentAllowlist: Array.isArray(candidate.contentAllowlist)
      ? candidate.contentAllowlist.filter((item): item is string => typeof item === "string")
      : []
  };
}

function popupResolveLanguage(preference: PopupLanguagePreference): PopupResolvedLanguage {
  if (preference === "zh-CN" || preference === "en") return preference;
  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

async function popupLoadSettings(): Promise<PopupSettings> {
  const stored = await popupStorageGet(POPUP_STORAGE_KEY);
  return popupSanitizeSettings(stored[POPUP_STORAGE_KEY]);
}

async function popupSaveSettings(settings: PopupSettings): Promise<void> {
  await popupStorageSet({ [POPUP_STORAGE_KEY]: settings });
}

async function popupApplyProtection(settings: PopupSettings): Promise<void> {
  const shouldEnable = settings.enabled && settings.adsEnabled;
  const enabled = await popupGetEnabledRulesets();
  const isEnabled = enabled.includes(POPUP_ADS_RULESET_ID);
  if (shouldEnable === isEnabled) return;

  await popupUpdateEnabledRulesets(
    shouldEnable
      ? { enableRulesetIds: [POPUP_ADS_RULESET_ID] }
      : { disableRulesetIds: [POPUP_ADS_RULESET_ID] }
  );
}

const protection = popupRequireElement<HTMLInputElement>("#protection");
const popupCosmeticToggle = popupRequireElement<HTMLInputElement>("#cosmetic-enabled");
const popupContentToggle = popupRequireElement<HTMLInputElement>("#content-enabled");
const statusElement = popupRequireElement<HTMLElement>("#status");
const cosmeticStatus = popupRequireElement<HTMLElement>("#cosmetic-status");
const contentStatus = popupRequireElement<HTMLElement>("#content-status");
const protectionLabel = popupRequireElement<HTMLElement>("#protection-label");
const popupCosmeticLabel = popupRequireElement<HTMLElement>("#cosmetic-label");
const cosmeticHint = popupRequireElement<HTMLElement>("#cosmetic-hint");
const popupContentLabel = popupRequireElement<HTMLElement>("#content-label");
const popupContentHint = popupRequireElement<HTMLElement>("#content-hint");
const optionsButton = popupRequireElement<HTMLButtonElement>("#open-options");
const popupLanguageSelect = popupRequireElement<HTMLSelectElement>("#language-select");

function popupApplyTranslations(settings: PopupSettings): void {
  const language = popupResolveLanguage(settings.language);
  const strings = POPUP_STRINGS[language];

  document.documentElement.lang = language;
  protectionLabel.textContent = strings.protection;
  popupCosmeticLabel.textContent = strings.cosmetic;
  cosmeticHint.textContent = strings.cosmeticHint;
  popupContentLabel.textContent = strings.content;
  popupContentHint.textContent = strings.contentHint;
  optionsButton.textContent = strings.options;
  statusElement.textContent = settings.enabled ? strings.enabled : strings.disabled;
  cosmeticStatus.textContent = settings.cosmeticEnabled ? strings.cosmeticOn : strings.cosmeticOff;
  contentStatus.textContent = settings.contentEnabled ? strings.contentOn : strings.contentOff;

  const autoOption = popupLanguageSelect.querySelector<HTMLOptionElement>('option[value="auto"]');
  if (autoOption) autoOption.textContent = strings.languageAuto;
  popupLanguageSelect.value = settings.language;
}

async function popupRefresh(): Promise<void> {
  const settings = await popupLoadSettings();
  protection.checked = settings.enabled;
  popupCosmeticToggle.checked = settings.cosmeticEnabled;
  popupContentToggle.checked = settings.contentEnabled;
  popupApplyTranslations(settings);
  protection.disabled = false;
  popupCosmeticToggle.disabled = false;
  popupContentToggle.disabled = false;
  popupLanguageSelect.disabled = false;
}

protection.disabled = true;
popupCosmeticToggle.disabled = true;
popupContentToggle.disabled = true;
popupLanguageSelect.disabled = true;

protection.addEventListener("change", async () => {
  protection.disabled = true;
  try {
    const settings = await popupLoadSettings();
    settings.enabled = protection.checked;
    await popupSaveSettings(settings);
    await popupApplyProtection(settings);
    await popupApplyCosmetic(settings);
    await popupApplyContentFilter(settings);
    popupApplyTranslations(settings);
  } catch (error) {
    statusElement.textContent = error instanceof Error ? error.message : "Could not update protection";
    await popupRefresh().catch(() => undefined);
  } finally {
    protection.disabled = false;
  }
});

popupCosmeticToggle.addEventListener("change", () => {
  popupCosmeticToggle.disabled = true;

  if (popupCosmeticToggle.checked) {
    void popupPermissionRequest().then(async (granted) => {
      const settings = await popupLoadSettings();
      const strings = POPUP_STRINGS[popupResolveLanguage(settings.language)];

      if (!granted) {
        settings.cosmeticEnabled = false;
        popupCosmeticToggle.checked = false;
        await popupSaveSettings(settings);
        popupApplyTranslations(settings);
        cosmeticStatus.textContent = strings.permissionDenied;
        return;
      }

      settings.cosmeticEnabled = true;
      await popupSaveSettings(settings);
      await popupApplyCosmetic(settings);
      popupApplyTranslations(settings);
      cosmeticStatus.textContent = strings.cosmeticEnabled;
    }).catch((error) => {
      popupCosmeticToggle.checked = false;
      cosmeticStatus.textContent =
        error instanceof Error ? error.message : "Could not request website access.";
    }).finally(() => {
      popupCosmeticToggle.disabled = false;
    });
    return;
  }

  void popupLoadSettings().then(async (settings) => {
    settings.cosmeticEnabled = false;
    await popupSaveSettings(settings);
    await popupApplyCosmetic(settings);
    await popupMaybeRemoveSiteAccess(settings);
    popupApplyTranslations(settings);
    cosmeticStatus.textContent = POPUP_STRINGS[popupResolveLanguage(settings.language)].cosmeticDisabled;
  }).catch((error) => {
    popupCosmeticToggle.checked = true;
    cosmeticStatus.textContent =
      error instanceof Error ? error.message : "Could not disable page ad cleanup.";
  }).finally(() => {
    popupCosmeticToggle.disabled = false;
  });
});

popupContentToggle.addEventListener("change", () => {
  popupContentToggle.disabled = true;

  if (popupContentToggle.checked) {
    void popupLoadSettings().then(async (settings) => {
      const strings = POPUP_STRINGS[popupResolveLanguage(settings.language)];

      if (!popupHasSelectedCategory(settings)) {
        settings.contentEnabled = false;
        popupContentToggle.checked = false;
        await popupSaveSettings(settings);
        popupApplyTranslations(settings);
        contentStatus.textContent = strings.contentNoCategories;
        return;
      }

      const granted = await popupPermissionRequest();
      if (!granted) {
        settings.contentEnabled = false;
        popupContentToggle.checked = false;
        await popupSaveSettings(settings);
        popupApplyTranslations(settings);
        contentStatus.textContent = strings.permissionDenied;
        return;
      }

      settings.contentEnabled = true;
      await popupSaveSettings(settings);
      await popupApplyContentFilter(settings);
      popupApplyTranslations(settings);
      contentStatus.textContent = strings.contentEnabled;
    }).catch((error) => {
      popupContentToggle.checked = false;
      contentStatus.textContent =
        error instanceof Error ? error.message : "Could not enable content filtering.";
    }).finally(() => {
      popupContentToggle.disabled = false;
    });
    return;
  }

  void popupLoadSettings().then(async (settings) => {
    settings.contentEnabled = false;
    await popupSaveSettings(settings);
    await popupApplyContentFilter(settings);
    await popupMaybeRemoveSiteAccess(settings);
    popupApplyTranslations(settings);
    contentStatus.textContent = POPUP_STRINGS[popupResolveLanguage(settings.language)].contentDisabled;
  }).catch((error) => {
    popupContentToggle.checked = true;
    contentStatus.textContent =
      error instanceof Error ? error.message : "Could not disable content filtering.";
  }).finally(() => {
    popupContentToggle.disabled = false;
  });
});

popupLanguageSelect.addEventListener("change", () => {
  void popupLoadSettings().then(async (settings) => {
    settings.language = popupSanitizeLanguage(popupLanguageSelect.value);
    await popupSaveSettings(settings);
    popupApplyTranslations(settings);
  }).catch((error) => {
    statusElement.textContent = error instanceof Error ? error.message : "Could not update language.";
  });
});

optionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage(() => {
    if (chrome.runtime.lastError) {
      statusElement.textContent = popupRuntimeError("Could not open options").message;
    }
  });
});

void popupLoadSettings().then(async (settings) => {
  const permissionGranted = await popupPermissionContains();
  if (!permissionGranted && (settings.cosmeticEnabled || settings.contentEnabled)) {
    settings.cosmeticEnabled = false;
    settings.contentEnabled = false;
    await popupSaveSettings(settings);
  }

  protection.checked = settings.enabled;
  popupCosmeticToggle.checked = settings.cosmeticEnabled;
  popupContentToggle.checked = settings.contentEnabled;
  popupApplyTranslations(settings);

  protection.disabled = false;
  popupCosmeticToggle.disabled = false;
  popupContentToggle.disabled = false;
  popupLanguageSelect.disabled = false;

  if (permissionGranted) {
    await popupApplyCosmetic(settings);
    await popupApplyContentFilter(settings);
  }
}).catch((error) => {
  statusElement.textContent = error instanceof Error ? error.message : "Could not load settings";
  protection.disabled = false;
  popupCosmeticToggle.disabled = false;
  popupContentToggle.disabled = false;
  popupLanguageSelect.disabled = false;
});
