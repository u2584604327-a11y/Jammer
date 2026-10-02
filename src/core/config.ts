export interface JammerSettings {
  enabled: boolean;
  adsEnabled: boolean;
  cosmeticEnabled: boolean;
  allowlist: string[];
}

export const DEFAULT_SETTINGS: JammerSettings = {
  enabled: true,
  adsEnabled: true,
  cosmeticEnabled: false,
  allowlist: []
};

const STORAGE_KEY = "jammerSettings";

function sanitizeSettings(value: unknown): JammerSettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_SETTINGS };
  const candidate = value as Partial<JammerSettings>;
  return {
    enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : true,
    adsEnabled: typeof candidate.adsEnabled === "boolean" ? candidate.adsEnabled : true,
    cosmeticEnabled: typeof candidate.cosmeticEnabled === "boolean" ? candidate.cosmeticEnabled : false,
    allowlist: Array.isArray(candidate.allowlist)
      ? candidate.allowlist.filter((item): item is string => typeof item === "string")
      : []
  };
}

export async function loadSettings(): Promise<JammerSettings> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return sanitizeSettings(stored[STORAGE_KEY]);
}

export async function saveSettings(settings: JammerSettings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
}
