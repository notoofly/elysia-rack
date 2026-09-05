// src/react/donate.ts
var DEFAULT_DONATE_URL = "https://ko-fi.com/notoofly_manu";
var DEFAULT_DONATE_LABEL = "☕ Donate";
var globalDonate = { enabled: true, url: DEFAULT_DONATE_URL, label: DEFAULT_DONATE_LABEL };
function setGlobalDonate(cfg) {
  if (cfg === false) {
    globalDonate = { enabled: false, url: DEFAULT_DONATE_URL, label: DEFAULT_DONATE_LABEL };
    return;
  }
  if (!cfg) {
    globalDonate = { enabled: true, url: DEFAULT_DONATE_URL, label: DEFAULT_DONATE_LABEL };
    return;
  }
  globalDonate = {
    enabled: cfg.enabled !== false,
    url: cfg.url ?? DEFAULT_DONATE_URL,
    label: cfg.label ?? DEFAULT_DONATE_LABEL
  };
}
function getGlobalDonate() {
  return globalDonate;
}
function resolveDonateProp(prop) {
  if (prop === false)
    return { enabled: false, url: DEFAULT_DONATE_URL, label: DEFAULT_DONATE_LABEL };
  if (prop === undefined)
    return getGlobalDonate();
  if (typeof prop === "object" && prop !== null) {
    const base = getGlobalDonate();
    return {
      enabled: prop.enabled !== false,
      url: prop.url ?? base.url,
      label: prop.label ?? base.label
    };
  }
  return getGlobalDonate();
}

export { setGlobalDonate, resolveDonateProp };
