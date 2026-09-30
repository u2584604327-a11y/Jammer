import { loadSettings, saveSettings, type JammerSettings } from "./core/config.js";
import { normalizeDomain } from "./core/domain.js";
import { applySettings } from "./core/dnr.js";

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}

const master = requireElement<HTMLInputElement>("#master-enabled");
const ads = requireElement<HTMLInputElement>("#ads-enabled");
const input = requireElement<HTMLInputElement>("#allowlist-input");
const addButton = requireElement<HTMLButtonElement>("#add-domain");
const list = requireElement<HTMLUListElement>("#allowlist");
const message = requireElement<HTMLElement>("#message");

master.disabled = true;
ads.disabled = true;
input.disabled = true;
addButton.disabled = true;

let settings: JammerSettings;

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
  await saveSettings(settings);
  await applySettings(settings);
}

async function updateAllowlist(next: string[]): Promise<void> {
  settings.allowlist = next;
  await persist();
  renderAllowlist();
  message.textContent = "Allowlist updated.";
}

master.addEventListener("change", () => {
  settings.enabled = master.checked;
  void persist().then(() => {
    message.textContent = "Protection setting updated.";
  }).catch(() => {
    message.textContent = "Could not update protection.";
  });
});

ads.addEventListener("change", () => {
  settings.adsEnabled = ads.checked;
  void persist().then(() => {
    message.textContent = "Ads rule group updated.";
  }).catch(() => {
    message.textContent = "Could not update ads rule group.";
  });
});

addButton.addEventListener("click", () => {
  try {
    const domain = normalizeDomain(input.value);
    if (settings.allowlist.includes(domain)) {
      message.textContent = "That domain is already allowlisted.";
      return;
    }
    input.value = "";
    void updateAllowlist([...settings.allowlist, domain]).catch(() => {
      message.textContent = "Could not update allowlist.";
    });
  } catch (error) {
    message.textContent = error instanceof Error ? error.message : "Invalid domain.";
  }
});

void loadSettings().then((loaded) => {
  settings = loaded;
  master.checked = settings.enabled;
  ads.checked = settings.adsEnabled;
  master.disabled = false;
  ads.disabled = false;
  input.disabled = false;
  addButton.disabled = false;
  renderAllowlist();
}).catch(() => {
  settings = { enabled: true, adsEnabled: true, allowlist: [] };
  message.textContent = "Could not load settings.";
});
