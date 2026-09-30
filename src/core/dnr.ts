import type { JammerSettings } from "./config.js";

export const ADS_RULESET_ID = "ads_static";
export const ALLOWLIST_RULE_ID_BASE = 1_000_000;
export const ALLOWLIST_RULE_ID_LIMIT = 1_999_999;

const ALLOWLIST_RESOURCE_TYPES: JammerResourceType[] = [
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

export function buildAllowlistRules(domains: string[]): JammerDnrRule[] {
  return domains.map((domain, index) => ({
    id: ALLOWLIST_RULE_ID_BASE + index,
    priority: 10_000,
    action: { type: "allow" },
    condition: {
      initiatorDomains: [domain],
      resourceTypes: ALLOWLIST_RESOURCE_TYPES
    }
  }));
}

export async function applyProtection(settings: JammerSettings): Promise<void> {
  const shouldEnable = settings.enabled && settings.adsEnabled;
  const enabled = await chrome.declarativeNetRequest.getEnabledRulesets();
  const isEnabled = enabled.includes(ADS_RULESET_ID);
  if (shouldEnable === isEnabled) return;

  await chrome.declarativeNetRequest.updateEnabledRulesets(
    shouldEnable
      ? { enableRulesetIds: [ADS_RULESET_ID] }
      : { disableRulesetIds: [ADS_RULESET_ID] }
  );
}

export async function syncAllowlistRules(domains: string[]): Promise<void> {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing
    .filter((rule) => rule.id >= ALLOWLIST_RULE_ID_BASE && rule.id <= ALLOWLIST_RULE_ID_LIMIT)
    .map((rule) => rule.id);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules: buildAllowlistRules(domains)
  });
}

export async function applySettings(settings: JammerSettings): Promise<void> {
  await applyProtection(settings);
  await syncAllowlistRules(settings.allowlist);
}
