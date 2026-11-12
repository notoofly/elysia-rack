import type { ReactNode } from "react";
import { RackIcon } from "./Icon";

export interface MastheadProps {
  title: string;
  icon?: string;
  detail?: ReactNode;
  actions?: ReactNode;
}

export function Masthead({ title, icon, detail, actions }: MastheadProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 pb-4">
      <div className="min-w-0">
        <h1 className="font-display flex items-center gap-2 text-2xl leading-tight tracking-tight">
          {icon ? (
            <RackIcon name={icon} size={22} className="size-[22px] shrink-0" />
          ) : null}
          {title}
        </h1>
        {detail ? (
          <p className="text-text-muted mt-1 text-sm">{detail}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {actions}
        <button
          id="koran-theme-toggle"
          type="button"
          className="border-border text-muted-foreground hover:bg-navigation-hover hover:text-foreground rounded-md border px-2.5 py-1.5 text-xs"
        >
          ◐ Theme
        </button>
      </div>
    </header>
  );
}
