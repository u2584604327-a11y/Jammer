type JammerResourceType =
  | "main_frame"
  | "sub_frame"
  | "stylesheet"
  | "script"
  | "image"
  | "font"
  | "object"
  | "xmlhttprequest"
  | "ping"
  | "csp_report"
  | "media"
  | "websocket"
  | "webtransport"
  | "webbundle"
  | "other";

type JammerDnrRule = {
  id: number;
  priority: number;
  action: { type: "allow" | "block" | "upgradeScheme" };
  condition: {
    initiatorDomains?: string[];
    urlFilter?: string;
    regexFilter?: string;
    resourceTypes?: JammerResourceType[];
  };
};

type JammerContentScript = {
  id: string;
  matches: string[];
  excludeMatches?: string[];
  css?: string[];
  js?: string[];
  runAt?: "document_start" | "document_end" | "document_idle";
  allFrames?: boolean;
  persistAcrossSessions?: boolean;
};

interface JammerStorageChange {
  oldValue?: unknown;
  newValue?: unknown;
}

interface JammerStorageChangedEvent {
  addListener(
    callback: (changes: Record<string, JammerStorageChange>, areaName: string) => void
  ): void;
}


declare const chrome: {
  storage: {
    local: {
      get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
      get(
        keys: string | string[] | Record<string, unknown> | null | undefined,
        callback: (items: Record<string, unknown>) => void
      ): void;
      set(items: Record<string, unknown>): Promise<void>;
      set(items: Record<string, unknown>, callback: () => void): void;
    };
    onChanged: JammerStorageChangedEvent;
  };
  permissions: {
    contains(
      permissions: { permissions?: string[]; origins?: string[] },
      callback: (result: boolean) => void
    ): void;
    request(
      permissions: { permissions?: string[]; origins?: string[] },
      callback: (granted: boolean) => void
    ): void;
    remove(
      permissions: { permissions?: string[]; origins?: string[] },
      callback: (removed: boolean) => void
    ): void;
  };
  scripting: {
    getRegisteredContentScripts(
      filter: { ids?: string[] },
      callback: (scripts: JammerContentScript[]) => void
    ): void;
    registerContentScripts(scripts: JammerContentScript[], callback: () => void): void;
    unregisterContentScripts(filter: { ids?: string[] }, callback: () => void): void;
  };
  declarativeNetRequest: {
    getEnabledRulesets(): Promise<string[]>;
    getEnabledRulesets(callback: (rulesetIds: string[]) => void): void;
    updateEnabledRulesets(options: {
      enableRulesetIds?: string[];
      disableRulesetIds?: string[];
    }): Promise<void>;
    updateEnabledRulesets(
      options: {
        enableRulesetIds?: string[];
        disableRulesetIds?: string[];
      },
      callback: () => void
    ): void;
    getDynamicRules(): Promise<JammerDnrRule[]>;
    getDynamicRules(callback: (rules: JammerDnrRule[]) => void): void;
    updateDynamicRules(options: {
      removeRuleIds?: number[];
      addRules?: JammerDnrRule[];
    }): Promise<void>;
    updateDynamicRules(
      options: {
        removeRuleIds?: number[];
        addRules?: JammerDnrRule[];
      },
      callback: () => void
    ): void;
  };
  runtime: {
    lastError?: { message?: string };
    openOptionsPage(): Promise<void>;
    openOptionsPage(callback: () => void): void;
  };
};
