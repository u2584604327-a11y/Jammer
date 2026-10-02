interface PopupSettings {
  enabled: boolean;
  adsEnabled: boolean;
  cosmeticEnabled: boolean;
  allowlist: string[];
}

const POPUP_STORAGE_KEY = "jammerSettings";
const POPUP_ADS_RULESET_ID = "ads_static";
const POPUP_COSMETIC_SCRIPT_ID = "jammer-cosmetic-css";
const POPUP_COSMETIC_ORIGINS = ["http://*/*", "https://*/*"];

const POPUP_DEFAULT_SETTINGS: PopupSettings = {
  enabled: true,
  adsEnabled: true,
  cosmeticEnabled: false,
  allowlist: []
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
  return domains.flatMap((domain) => [
    `*://${domain}/*`,
    `*://*.${domain}/*`
  ]);
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
    css: ["cosmetic.css"],
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

function popupSanitizeSettings(value: unknown): PopupSettings {
  if (!value || typeof value !== "object") return { ...POPUP_DEFAULT_SETTINGS };
  const candidate = value as Partial<PopupSettings>;
  return {
    enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : true,
    adsEnabled: typeof candidate.adsEnabled === "boolean" ? candidate.adsEnabled : true,
    cosmeticEnabled: typeof candidate.cosmeticEnabled === "boolean" ? candidate.cosmeticEnabled : false,
    allowlist: Array.isArray(candidate.allowlist)
      ? candidate.allowlist.filter((item): item is string => typeof item === "string")
      : []
  };
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
const statusElement = popupRequireElement<HTMLElement>("#status");
const optionsButton = popupRequireElement<HTMLButtonElement>("#open-options");

statusElement.textContent = "Starting…";
protection.disabled = true;

async function popupRefresh(): Promise<void> {
  const settings = await popupLoadSettings();
  protection.checked = settings.enabled;
  statusElement.textContent = settings.enabled ? "Enabled" : "Disabled";
  protection.disabled = false;
}

protection.addEventListener("change", async () => {
  protection.disabled = true;
  try {
    const settings = await popupLoadSettings();
    settings.enabled = protection.checked;
    await popupSaveSettings(settings);
    await popupApplyProtection(settings);
    await popupApplyCosmetic(settings);
    statusElement.textContent = settings.enabled ? "Enabled" : "Disabled";
  } catch (error) {
    statusElement.textContent = error instanceof Error ? error.message : "Could not update protection";
    try {
      await popupRefresh();
    } catch {
      protection.disabled = false;
    }
  } finally {
    protection.disabled = false;
  }
});

optionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage(() => {
    if (chrome.runtime.lastError) {
      statusElement.textContent = popupRuntimeError("Could not open options").message;
    }
  });
});

void popupLoadSettings().then(async (settings) => {
  protection.checked = settings.enabled;
  statusElement.textContent = settings.enabled ? "Enabled" : "Disabled";
  protection.disabled = false;

  const granted = await popupPermissionContains();
  if (granted) await popupApplyCosmetic(settings);
}).catch((error) => {
  statusElement.textContent = error instanceof Error ? error.message : "Could not load settings";
  protection.disabled = false;
});
