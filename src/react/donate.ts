export const DEFAULT_DONATE_URL = "https://ko-fi.com/notoofly_manu";
export const DEFAULT_DONATE_LABEL = "☕ Donate";

export type ResolvedDonate = { enabled: boolean; url: string; label: string };

let globalDonate: ResolvedDonate = { enabled: true, url: DEFAULT_DONATE_URL, label: DEFAULT_DONATE_LABEL };

export function setGlobalDonate(enabled?: boolean) {
  globalDonate = { enabled: enabled !== false, url: DEFAULT_DONATE_URL, label: DEFAULT_DONATE_LABEL };
}

export function getGlobalDonate(): ResolvedDonate {
  return globalDonate;
}

export function resolveDonateProp(prop?: boolean): ResolvedDonate {
  if (prop === false) return { enabled: false, url: DEFAULT_DONATE_URL, label: DEFAULT_DONATE_LABEL };
  if (prop === true || prop === undefined) return getGlobalDonate();
  return getGlobalDonate();
}
