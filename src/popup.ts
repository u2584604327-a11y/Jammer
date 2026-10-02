type PopupLanguagePreference = "auto" | "zh-CN" | "en";
type PopupResolvedLanguage = "zh-CN" | "en";

interface PopupSettings {
  enabled: boolean;
  adsEnabled: boolean;
  cosmeticEnabled: boolean;
  language: PopupLanguagePreference;
  allowlist: string[];
}

const POPUP_STORAGE_KEY = "jammerSettings";
const POPUP_ADS_RULESET_ID = "ads_static";
const POPUP_COSMETIC_SCRIPT_ID = "jammer-popupCosmeticToggle-css";
const POPUP_COSMETIC_ORIGINS = ["http://*/*", "https://*/*"];

const POPUP_DEFAULT_SETTINGS: PopupSettings = {
  enabled: true,
  adsEnabled: true,
  cosmeticEnabled: false,
  language: "auto",
  allowlist: []
};

const POPUP_STRINGS: Record<PopupResolvedLanguage, Record<string, string>> = {
  en: {
    protection: "Protection",
    enabled: "Enabled",
    disabled: "Disabled",
    popupCosmeticToggle: "Page ad cleanup",
    cosmeticHint: "Hide explicit ad containers. Enabling requires website access.",
    cosmeticOn: "Page ad cleanup is on.",
    cosmeticOff: "Page ad cleanup is off.",
    cosmeticDenied: "Website access was not granted.",
    cosmeticEnabled: "Page ad cleanup enabled. Reload open pages.",
    cosmeticDisabled: "Page ad cleanup disabled and website access removed.",
    options: "Options",
    languageAuto: "Auto"
  },
  "zh-CN": {
    protection: "总保护",
    enabled: "已启用",
    disabled: "已停用",
    popupCosmeticToggle: "页面广告清理",
    cosmeticHint: "隐藏明确的页面广告容器。启用时需要网站访问权限。",
    cosmeticOn: "页面广告清理已开启。",
    cosmeticOff: "页面广告清理已关闭。",
    cosmeticDenied: "未授予网站访问权限。",
    cosmeticEnabled: "页面广告清理已启用，请刷新已打开页面。",
    cosmeticDisabled: "页面广告清理已关闭，并已撤销网站访问权限。",
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
      { permissions: ["scripting"], origins: POPUP_COSMETIC_ORIGINS },
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
      { permissions: ["scripting"], origins: POPUP_COSMETIC_ORIGINS },
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
      { permissions: ["scripting"], origins: POPUP_COSMETIC_ORIGINS },
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

function popupGetRegisteredCosmetic(): Promise<JammerContentScript[]> {
  return new Promise((resolve, reject) => {
    chrome.scripting.getRegisteredContentScripts(
      { ids: [POPUP_COSMETIC_SCRIPT_ID] },
      (scripts) => {
        if (chrome.runtime.lastError) {
          reject(popupRuntimeError("Cosmetic registration read failed"));
          return;
        }
        resolve(scripts);
      }
    );
  });
}

function popupRegisterContentScript(script: JammerContentScript): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.scripting.registerContentScripts([script], () => {
      if (chrome.runtime.lastError) {
        reject(popupRuntimeError("Cosmetic registration failed"));
        return;
      }
      resolve();
    });
  });
}

function popupUnregisterContentScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.scripting.unregisterContentScripts(
      { ids: [POPUP_COSMETIC_SCRIPT_ID] },
      () => {
        if (chrome.runtime.lastError) {
          reject(popupRuntimeError("Cosmetic unregister failed"));
          return;
        }
        resolve();
      }
    );
  });
}

function popupAllowlistExcludeMatches(domains: string[]): string[] {
  return domains.flatMap((domain) => {
    const exact = `*://${domain}/*`;
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(domain)) return [exact];
    return [exact, `*://*.${domain}/*`];
  });
}

async function popupUnregisterCosmeticIfPresent(): Promise<void> {
  const granted = await popupPermissionContains();
  if (!granted) return;

  const existing = await popupGetRegisteredCosmetic();
  if (existing.length > 0) await popupUnregisterContentScript();
}

async function popupApplyCosmetic(settings: PopupSettings): Promise<void> {
  const granted = await popupPermissionContains();

  if (!settings.enabled || !settings.cosmeticEnabled || !granted) {
    if (granted) await popupUnregisterCosmeticIfPresent();
    return;
  }

  await popupUnregisterCosmeticIfPresent();
  await popupRegisterContentScript({
    id: POPUP_COSMETIC_SCRIPT_ID,
    matches: POPUP_COSMETIC_ORIGINS,
    excludeMatches: popupAllowlistExcludeMatches(settings.allowlist),
    css: ["popupCosmeticToggle.css"],
    runAt: "document_start",
    allFrames: true,
    persistAcrossSessions: true
  });
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
  if (!value || typeof value !== "object") return { ...POPUP_DEFAULT_SETTINGS };
  const candidate = value as Partial<PopupSettings>;
  return {
    enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : true,
    adsEnabled: typeof candidate.adsEnabled === "boolean" ? candidate.adsEnabled : true,
    cosmeticEnabled: typeof candidate.cosmeticEnabled === "boolean" ? candidate.cosmeticEnabled : false,
    language: popupSanitizeLanguage(candidate.language),
    allowlist: Array.isArray(candidate.allowlist)
      ? candidate.allowlist.filter((item): item is string => typeof item === "string")
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
const popupCosmeticToggle = popupRequireElement<HTMLInputElement>("#popupCosmeticToggle-enabled");
const statusElement = popupRequireElement<HTMLElement>("#status");
const cosmeticStatus = popupRequireElement<HTMLElement>("#popupCosmeticToggle-status");
const protectionLabel = popupRequireElement<HTMLElement>("#protection-label");
const popupCosmeticLabel = popupRequireElement<HTMLElement>("#popupCosmeticToggle-label");
const cosmeticHint = popupRequireElement<HTMLElement>("#popupCosmeticToggle-hint");
const optionsButton = popupRequireElement<HTMLButtonElement>("#open-options");
const popupLanguageSelect = popupRequireElement<HTMLSelectElement>("#language-select");

function popupApplyTranslations(settings: PopupSettings): void {
  const language = popupResolveLanguage(settings.language);
  const strings = POPUP_STRINGS[language];

  document.documentElement.lang = language;
  protectionLabel.textContent = strings.protection;
  popupCosmeticLabel.textContent = strings.popupCosmeticToggle;
  cosmeticHint.textContent = strings.cosmeticHint;
  optionsButton.textContent = strings.options;
  statusElement.textContent = settings.enabled ? strings.enabled : strings.disabled;
  cosmeticStatus.textContent = settings.cosmeticEnabled ? strings.cosmeticOn : strings.cosmeticOff;

  const autoOption = popupLanguageSelect.querySelector<HTMLOptionElement>('option[value="auto"]');
  if (autoOption) autoOption.textContent = strings.languageAuto;
  popupLanguageSelect.value = settings.language;
}

async function popupRefresh(): Promise<void> {
  const settings = await popupLoadSettings();
  protection.checked = settings.enabled;
  popupCosmeticToggle.checked = settings.cosmeticEnabled;
  popupApplyTranslations(settings);
  protection.disabled = false;
  popupCosmeticToggle.disabled = false;
  popupLanguageSelect.disabled = false;
}

protection.disabled = true;
popupCosmeticToggle.disabled = true;
popupLanguageSelect.disabled = true;

protection.addEventListener("change", async () => {
  protection.disabled = true;
  try {
    const settings = await popupLoadSettings();
    settings.enabled = protection.checked;
    await popupSaveSettings(settings);
    await popupApplyProtection(settings);
    await popupApplyCosmetic(settings);
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
        cosmeticStatus.textContent = strings.cosmeticDenied;
        return;
      }

      settings.cosmeticEnabled = true;
      try {
        await popupSaveSettings(settings);
        await popupApplyCosmetic(settings);
        popupApplyTranslations(settings);
        cosmeticStatus.textContent = strings.cosmeticEnabled;
      } catch (error) {
        settings.cosmeticEnabled = false;
        popupCosmeticToggle.checked = false;
        await popupSaveSettings(settings);
        await popupUnregisterCosmeticIfPresent().catch(() => undefined);
        await popupPermissionRemove().catch(() => false);
        popupApplyTranslations(settings);
        cosmeticStatus.textContent = error instanceof Error ? error.message : strings.cosmeticOff;
      }
    }).catch((error) => {
      popupCosmeticToggle.checked = false;
      cosmeticStatus.textContent = error instanceof Error ? error.message : "Could not request website access.";
    }).finally(() => {
      popupCosmeticToggle.disabled = false;
    });
    return;
  }

  void popupLoadSettings().then(async (settings) => {
    settings.cosmeticEnabled = false;
    await popupSaveSettings(settings);
    await popupUnregisterCosmeticIfPresent();
    await popupPermissionRemove();
    popupApplyTranslations(settings);
    const strings = POPUP_STRINGS[popupResolveLanguage(settings.language)];
    cosmeticStatus.textContent = strings.cosmeticDisabled;
  }).catch((error) => {
    popupCosmeticToggle.checked = true;
    cosmeticStatus.textContent = error instanceof Error ? error.message : "Could not disable page ad cleanup.";
  }).finally(() => {
    popupCosmeticToggle.disabled = false;
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
  if (settings.cosmeticEnabled && !permissionGranted) {
    settings.cosmeticEnabled = false;
    await popupSaveSettings(settings);
  }

  protection.checked = settings.enabled;
  popupCosmeticToggle.checked = settings.cosmeticEnabled;
  popupApplyTranslations(settings);
  protection.disabled = false;
  popupCosmeticToggle.disabled = false;
  popupLanguageSelect.disabled = false;

  if (permissionGranted) await popupApplyCosmetic(settings);
}).catch((error) => {
  statusElement.textContent = error instanceof Error ? error.message : "Could not load settings";
  protection.disabled = false;
  popupCosmeticToggle.disabled = false;
  popupLanguageSelect.disabled = false;
});
