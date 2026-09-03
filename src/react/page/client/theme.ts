// Browser-only bundle (loaded via <script type="module">).
// DOM globals are declared manually so tsconfig without the DOM lib still passes.
declare const document: any;
declare const window: any;
declare const localStorage: any;

const STORAGE_KEY = "koran-theme";

function storedTheme(): string | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

function systemDark(): boolean {
  try {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  } catch {
    return false;
  }
}

export function toggleTheme(): void {
  const root = document.documentElement;
  const dark = root.classList.toggle("dark");
  root.classList.toggle("light", !dark);
  try {
    localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
  } catch {
    // ignore unavailable storage
  }
}

function init(): void {
  const stored = storedTheme();
  if (stored) document.documentElement.classList.add(stored);
  else if (systemDark()) document.documentElement.classList.add("dark");
  document
    .getElementById("koran-theme-toggle")
    ?.addEventListener("click", toggleTheme);
  window.__koranToggle = toggleTheme;
}

init();
