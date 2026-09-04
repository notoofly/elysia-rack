// src/react/page/client/theme.ts
var STORAGE_KEY = "koran-theme";
function storedTheme() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}
function systemDark() {
  try {
    return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}
function toggleTheme() {
  const root = document.documentElement;
  const dark = root.classList.toggle("dark");
  root.classList.toggle("light", !dark);
  try {
    localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
  } catch {}
}
function init() {
  const stored = storedTheme();
  if (stored)
    document.documentElement.classList.add(stored);
  else if (systemDark())
    document.documentElement.classList.add("dark");
  document.getElementById("koran-theme-toggle")?.addEventListener("click", toggleTheme);
  window.__koranToggle = toggleTheme;
}
init();
export {
  toggleTheme
};
