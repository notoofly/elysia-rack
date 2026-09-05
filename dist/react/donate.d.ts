import type { ReactRack } from "./types";
export declare const DEFAULT_DONATE_URL = "https://ko-fi.com/notoofly_manu";
export declare const DEFAULT_DONATE_LABEL = "\u2615 Donate";
export type ResolvedDonate = {
    enabled: boolean;
    url: string;
    label: string;
};
export declare function setGlobalDonate(cfg?: ReactRack.DonateConfig): void;
export declare function getGlobalDonate(): ResolvedDonate;
export declare function resolveDonateProp(prop?: ReactRack.DonateConfig): ResolvedDonate;
