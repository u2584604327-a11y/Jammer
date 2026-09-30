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
  action: { type: "allow" | "block" };
  condition: {
    initiatorDomains?: string[];
    urlFilter?: string;
    resourceTypes?: JammerResourceType[];
  };
};

declare const chrome: {
  storage: {
    local: {
      get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    };
  };
  declarativeNetRequest: {
    getEnabledRulesets(): Promise<string[]>;
    updateEnabledRulesets(options: {
      enableRulesetIds?: string[];
      disableRulesetIds?: string[];
    }): Promise<void>;
    getDynamicRules(): Promise<JammerDnrRule[]>;
    updateDynamicRules(options: {
      removeRuleIds?: number[];
      addRules?: JammerDnrRule[];
    }): Promise<void>;
  };
  runtime: {
    openOptionsPage(): Promise<void>;
  };
};
