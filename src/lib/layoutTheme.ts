export type LayoutThemeSettings = {
  sidebarBg: string;
  sidebarBorder: string;
  sidebarText: string;
  topbarBg: string;
  topbarBorder: string;
  hoverBg: string;
};

const KEY = "vf_layout_theme";

export const DEFAULT_LAYOUT_THEME: LayoutThemeSettings = {
  sidebarBg: "#ffffff",
  sidebarBorder: "#d6dbe6",
  sidebarText: "#263247",
  topbarBg: "#ffffff",
  topbarBorder: "#d6dbe6",
  hoverBg: "#e6edf8",
};

export function loadLayoutTheme(): LayoutThemeSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_LAYOUT_THEME;
    return { ...DEFAULT_LAYOUT_THEME, ...(JSON.parse(raw) as Partial<LayoutThemeSettings>) };
  } catch {
    return DEFAULT_LAYOUT_THEME;
  }
}

export function saveLayoutTheme(theme: LayoutThemeSettings) {
  localStorage.setItem(KEY, JSON.stringify(theme));
}

function normalizeHex(hex: string): string {
  const clean = hex.trim().replace("#", "");
  if (clean.length === 3) return `#${clean.split("").map((c) => c + c).join("")}`;
  if (clean.length === 6) return `#${clean}`;
  return "#000000";
}

function hexToRgb(hex: string) {
  const n = normalizeHex(hex);
  return {
    r: parseInt(n.slice(1, 3), 16),
    g: parseInt(n.slice(3, 5), 16),
    b: parseInt(n.slice(5, 7), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${clamp(r).toString(16).padStart(2, "0")}${clamp(g).toString(16).padStart(2, "0")}${clamp(b).toString(16).padStart(2, "0")}`;
}

function shift(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + amount, g + amount, b + amount);
}

function mix(hexA: string, hexB: string, ratio: number) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const t = Math.max(0, Math.min(1, ratio));
  return rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
}

function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function applyLayoutTheme(theme: LayoutThemeSettings) {
  const root = document.documentElement;
  const active = luminance(theme.hoverBg) > 0.6 ? shift(theme.hoverBg, -18) : shift(theme.hoverBg, 18);
  const sidebarTextSoft = mix(theme.sidebarText, "#ffffff", 0.35);
  root.style.setProperty("--vf-sidebar-bg-color", theme.sidebarBg);
  root.style.setProperty("--vf-sidebar-border-color", theme.sidebarBorder);
  root.style.setProperty("--vf-sidebar-text-color", theme.sidebarText);
  root.style.setProperty("--vf-sidebar-text-soft-color", sidebarTextSoft);
  root.style.setProperty("--vf-topbar-bg-color", theme.topbarBg);
  root.style.setProperty("--vf-topbar-border-color", theme.topbarBorder);
  root.style.setProperty("--vf-nav-hover-color", theme.hoverBg);
  root.style.setProperty("--vf-nav-active-color", active);
}
