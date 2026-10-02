const RULESETS = [
  "urlfilter_baseline",
  "requestdomains_single",
  "requestdomains_batch"
];

const statusElement = document.querySelector("#status");
const messageElement = document.querySelector("#message");

function runtimeError(prefix) {
  const message = chrome.runtime.lastError && chrome.runtime.lastError.message;
  return new Error(message ? prefix + ": " + message : prefix);
}

function getEnabledRulesets() {
  return new Promise((resolve, reject) => {
    chrome.declarativeNetRequest.getEnabledRulesets((ids) => {
      if (chrome.runtime.lastError) {
        reject(runtimeError("Could not read rulesets"));
        return;
      }
      resolve(ids);
    });
  });
}

function updateEnabledRulesets(enableIds, disableIds) {
  return new Promise((resolve, reject) => {
    chrome.declarativeNetRequest.updateEnabledRulesets(
      { enableRulesetIds: enableIds, disableRulesetIds: disableIds },
      () => {
        if (chrome.runtime.lastError) {
          reject(runtimeError("Could not update rulesets"));
          return;
        }
        resolve();
      }
    );
  });
}

async function refresh() {
  const enabled = await getEnabledRulesets();
  const active = RULESETS.filter((id) => enabled.includes(id));
  statusElement.textContent = active.length ? active.join(", ") : "OFF";
}

async function selectMode(mode) {
  const enable = mode === "off" ? [] : [mode];
  const disable = RULESETS.filter((id) => id !== mode);
  await updateEnabledRulesets(enable, disable);
  await refresh();
  messageElement.textContent = "Mode applied. Refresh example.com now.";
}

document.querySelectorAll("button[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    messageElement.textContent = "Applying…";
    void selectMode(button.dataset.mode).catch((error) => {
      messageElement.textContent = error instanceof Error ? error.message : "Update failed";
    });
  });
});

void refresh().catch((error) => {
  statusElement.textContent = "ERROR";
  messageElement.textContent = error instanceof Error ? error.message : "Could not load";
});
