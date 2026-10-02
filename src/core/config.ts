export type JammerLanguage = "auto" | "zh-CN" | "en";

export type JammerContentCategoryKey = "gambling" | "explicit" | "violence" | "scam" | "clickbait";

export type JammerContentCategories = Record<JammerContentCategoryKey, boolean>;

export interface JammerSettings {
  enabled: boolean;
  adsEnabled: boolean;
  privacyEnabled: boolean;
  phishingEnabled: boolean;
  secureNavigationEnabled: boolean;
  cosmeticEnabled: boolean;
  contentEnabled: boolean;
  contentCategories: JammerContentCategories;
  language: JammerLanguage;
  allowlist: string[];
  contentAllowlist: string[];
  blockedDomains: string[];
}

export const DEFAULT_SETTINGS: JammerSettings = {
  enabled: true,
  adsEnabled: true,
  privacyEnabled: true,
  phishingEnabled: true,
  secureNavigationEnabled: false,
  cosmeticEnabled: false,
  contentEnabled: false,
  contentCategories: {
    gambling: false,
    explicit: false,
    violence: false,
    scam: false,
    clickbait: false
  },
  language: "auto",
  allowlist: [],
  contentAllowlist: [],
  blockedDomains: []
};

const STORAGE_KEY = "jammerSettings";

function sanitizeLanguage(value: unknown): JammerLanguage {
  return value === "zh-CN" || value === "en" || value === "auto" ? value : "auto";
}

function sanitizeSettings(value: unknown): JammerSettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_SETTINGS };
  const candidate = value as Partial<JammerSettings>;
  const categories =
    candidate.contentCategories && typeof candidate.contentCategories === "object"
      ? candidate.contentCategories as Partial<JammerContentCategories>
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
    language: sanitizeLanguage(candidate.language),
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

export async function loadSettings(): Promise<JammerSettings> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return sanitizeSettings(stored[STORAGE_KEY]);
}

export async function saveSettings(settings: JammerSettings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
}
