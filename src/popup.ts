import { loadSettings, saveSettings } from "./core/config.js";
import { applySettings } from "./core/dnr.js";

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}

const protection = requireElement<HTMLInputElement>("#protection");
const status = requireElement<HTMLElement>("#status");
const optionsButton = requireElement<HTMLButtonElement>("#open-options");

async function refresh(): Promise<void> {
  const settings = await loadSettings();
  protection.checked = settings.enabled;
  status.textContent = settings.enabled ? "Enabled" : "Disabled";
}

protection.addEventListener("change", async () => {
  protection.disabled = true;
  try {
    const settings = await loadSettings();
    settings.enabled = protection.checked;
    await saveSettings(settings);
    await applySettings(settings);
    status.textContent = settings.enabled ? "Enabled" : "Disabled";
  } catch {
    status.textContent = "Could not update protection";
    await refresh();
  } finally {
    protection.disabled = false;
  }
});

optionsButton.addEventListener("click", () => {
  void chrome.runtime.openOptionsPage();
});

void refresh().catch(() => {
  status.textContent = "Could not load settings";
});
