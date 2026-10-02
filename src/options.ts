interface OptionsSettings {
  enabled: boolean;
  adsEnabled: boolean;
  cosmeticEnabled: boolean;
  allowlist: string[];
}

const OPTIONS_STORAGE_KEY = "jammerSettings";
const OPTIONS_ADS_RULESET_ID = "ads_static";
const OPTIONS_ALLOWLIST_RULE_ID_BASE = 1_000_000;
const OPTIONS_ALLOWLIST_RULE_ID_LIMIT = 1_999_999;
const OPTIONS_COSMETIC_SCRIPT_ID = "jammer-cosmetic-css";
const OPTIONS_COSMETIC_ORIGINS = ["http://*/*", "https://*/*"];

const OPTIONS_DEFAULT_SETTINGS: OptionsSettings = {
  enabled: true,
  adsEnabled: true,
  cosmeticEnabled: false,
  allowlist: []
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
      { ids: [OPTIONS_COSMETIC_SCRIPT_ID] },
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
      { ids: [OPTIONS_COSMETIC_SCRIPT_ID] },
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
  return domains.flatMap((domain) => [
    `*://${domain}/*`,
    `*://*.${domain}/*`
  ]);
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
    css: ["cosmetic.css"],
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

function optionsSanitizeSettings(value: unknown): OptionsSettings {
  if (!value || typeof value !== "object") return { ...OPTIONS_DEFAULT_SETTINGS };
  const candidate = value as Partial<OptionsSettings>;
  return {
    enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : true,
    adsEnabled: typeof candidate.adsEnabled === "boolean" ? candidate.adsEnabled : true,
    cosmeticEnabled: typeof candidate.cosmeticEnabled === "boolean" ? candidate.cosmeticEnabled : false,
    allowlist: Array.isArray(candidate.allowlist)
      ? candidate.allowlist.filter((item): item is string => typeof item === "string")
      : []
  };
}

function optionsNormalizeDomain(value: string): string {
  const input = value.trim();
  if (!input) throw new Error("Enter a domain.");

  let url: URL;
  try {
    url = new URL(input.includes("://") ? input : `https://${input}`);
  } catch {
    throw new Error("Enter a valid domain.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http/https domains are supported.");
  }
  if (url.username || url.password) {
    throw new Error("Credentials are not allowed in allowlist entries.");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || hostname.length > 253 || !hostname.includes(".")) {
    throw new Error("Enter a fully qualified domain.");
  }

  const labels = hostname.split(".");
  if (labels.some((label) => !OPTIONS_LABEL_RE.test(label))) {
    throw new Error("Enter a valid domain.");
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

const master = optionsRequireElement<HTMLInputElement>("#master-enabled");
const ads = optionsRequireElement<HTMLInputElement>("#ads-enabled");
const cosmetic = optionsRequireElement<HTMLInputElement>("#cosmetic-enabled");
const input = optionsRequireElement<HTMLInputElement>("#allowlist-input");
const addButton = optionsRequireElement<HTMLButtonElement>("#add-domain");
const list = optionsRequireElement<HTMLUListElement>("#allowlist");
const message = optionsRequireElement<HTMLElement>("#message");

master.disabled = true;
ads.disabled = true;
cosmetic.disabled = true;
input.disabled = true;
addButton.disabled = true;

let settings: OptionsSettings = { ...OPTIONS_DEFAULT_SETTINGS };

function renderAllowlist(): void {
  list.replaceChildren();
  for (const domain of settings.allowlist) {
    const item = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = domain;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
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
  message.textContent = "Allowlist updated. Reload open pages for cosmetic changes.";
}

master.addEventListener("change", () => {
  settings.enabled = master.checked;
  void persist().then(() => {
    message.textContent = "Protection setting updated. Reload open pages for cosmetic changes.";
  }).catch((error) => {
    message.textContent = error instanceof Error ? error.message : "Could not update protection.";
  });
});

ads.addEventListener("change", () => {
  settings.adsEnabled = ads.checked;
  void persist().then(() => {
    message.textContent = "Network ad blocking updated.";
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
        message.textContent = "Website access was not granted. Page ad cleanup remains off.";
        return;
      }

      settings.cosmeticEnabled = true;
      try {
        await optionsSaveSettings(settings);
        await optionsApplyCosmetic(settings);
        message.textContent = "Page ad cleanup enabled. Reload open pages.";
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
    message.textContent = "Page ad cleanup disabled and website access removed.";
  }).catch((error) => {
    cosmetic.checked = true;
    settings.cosmeticEnabled = true;
    message.textContent = error instanceof Error ? error.message : "Could not disable page ad cleanup.";
  }).finally(() => {
    cosmetic.disabled = false;
  });
});

addButton.addEventListener("click", () => {
  try {
    const domain = optionsNormalizeDomain(input.value);
    if (settings.allowlist.includes(domain)) {
      message.textContent = "That domain is already allowlisted.";
      return;
    }
    input.value = "";
    void updateAllowlist([...settings.allowlist, domain]).catch((error) => {
      message.textContent = error instanceof Error ? error.message : "Could not update allowlist.";
    });
  } catch (error) {
    message.textContent = error instanceof Error ? error.message : "Invalid domain.";
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

  if (permissionGranted) {
    await optionsApplyCosmetic(settings);
  }

  master.disabled = false;
  ads.disabled = false;
  cosmetic.disabled = false;
  input.disabled = false;
  addButton.disabled = false;
  renderAllowlist();
}).catch((error) => {
  message.textContent = error instanceof Error ? error.message : "Could not load settings.";
});
