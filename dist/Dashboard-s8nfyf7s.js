import"./index-37x76zdn.js";

// src/react/page/Dashboard.tsx
import { jsxDEV } from "react/jsx-dev-runtime";
async function Dashboard(props) {
  return /* @__PURE__ */ jsxDEV("div", {
    className: "koran-paper font-koran-body text-foreground flex min-h-screen items-center justify-center p-6",
    children: /* @__PURE__ */ jsxDEV("div", {
      className: "bg-card border-border max-w-lg rounded-xl border px-8 py-12 text-center shadow-sm",
      children: [
        /* @__PURE__ */ jsxDEV("p", {
          className: "text-text-muted text-xs font-semibold tracking-widest uppercase",
          children: "Dashboard"
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsxDEV("h1", {
          className: "font-koran mt-2 text-4xl font-black tracking-tight",
          children: "Coming Soon"
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsxDEV("p", {
          className: "text-text-muted mt-3 text-sm leading-relaxed",
          children: [
            props.name ? `${props.name} — ` : "",
            "This dashboard is coming soon. Your panels are available via the sidebar in each resource view."
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ jsxDEV("div", {
          className: "mt-6 flex justify-center",
          children: /* @__PURE__ */ jsxDEV("span", {
            className: "bg-primary text-primary-foreground rounded-md px-4 py-1.5 text-sm font-semibold",
            children: "Stay tuned"
          }, undefined, false, undefined, this)
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this)
  }, undefined, false, undefined, this);
}
export {
  Dashboard as default
};
