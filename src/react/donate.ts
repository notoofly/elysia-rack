import type { ReactRack } from "./types";

export const DEFAULT_DONATE_URL = "https://ko-fi.com/notoofly_manu";
export const DEFAULT_DONATE_LABEL = "☕ Donate";

export type ResolvedDonate = { enabled: boolean; url: string; label: string };

let globalDonate: ResolvedDonate = { enabled: true, url: DEFAULT_DONATE_URL, label: DEFAULT_DONATE_LABEL };

export function setGlobalDonate(cfg?: ReactRack.DonateConfig) {
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
    label: cfg.label ?? DEFAULT_DONATE_LABEL,
  };
}

export function getGlobalDonate(): ResolvedDonate {
  return globalDonate;
}

export function resolveDonateProp(prop?: ReactRack.DonateConfig): ResolvedDonate {
  if (prop === false) return { enabled: false, url: DEFAULT_DONATE_URL, label: DEFAULT_DONATE_LABEL };
  if (prop === undefined) return getGlobalDonate();
  if (typeof prop === "object" && prop !== null) {
    const base = getGlobalDonate();
    return {
      enabled: prop.enabled !== false,
      url: prop.url ?? base.url,
      label: prop.label ?? base.label,
    };
  }
  return getGlobalDonate();
}
