interface PopupSettings {
  enabled: boolean;
  adsEnabled: boolean;
  allowlist: string[];
}

const POPUP_STORAGE_KEY = "jammerSettings";
const POPUP_ADS_RULESET_ID = "ads_static";
const POPUP_DEFAULT_SETTINGS: PopupSettings = {
  enabled: true,
  adsEnabled: true,
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

void popupRefresh().catch((error) => {
  statusElement.textContent = error instanceof Error ? error.message : "Could not load settings";
  protection.disabled = false;
});
