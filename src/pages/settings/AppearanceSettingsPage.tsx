import React from "react";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Palette } from "lucide-react";
import { applyLayoutTheme, DEFAULT_LAYOUT_THEME, loadLayoutTheme, saveLayoutTheme, type LayoutThemeSettings } from "@/lib/layoutTheme";

const PRESET_COLORS = [
  "#F8FAFC",
  "#F1F5F9",
  "#E2E8F0",
  "#CBD5E1",
  "#94A3B8",
  "#64748B",
  "#475569",
  "#334155",
  "#1E293B",
  "#0F172A",
  "#FAFAF9",
  "#F5F5F4",
  "#E7E5E4",
  "#D6D3D1",
  "#A8A29E",
  "#78716C",
  "#57534E",
  "#44403C",
  "#292524",
  "#1C1917",
  "#EFF6FF",
  "#DBEAFE",
  "#BFDBFE",
  "#93C5FD",
  "#60A5FA",
  "#3B82F6",
  "#2563EB",
  "#1D4ED8",
  "#1E40AF",
  "#1E3A8A",
  "#ECFEFF",
  "#CFFAFE",
  "#A5F3FC",
  "#67E8F9",
  "#22D3EE",
  "#06B6D4",
  "#0891B2",
  "#0E7490",
  "#155E75",
  "#164E63",
  "#ECFDF5",
  "#D1FAE5",
  "#A7F3D0",
  "#6EE7B7",
  "#34D399",
  "#10B981",
  "#059669",
  "#047857",
  "#065F46",
  "#064E3B",
  "#F5F3FF",
  "#EDE9FE",
  "#DDD6FE",
  "#C4B5FD",
  "#A78BFA",
  "#8B5CF6",
  "#7C3AED",
  "#6D28D9",
  "#5B21B6",
  "#4C1D95",
  "#FEF3C7",
  "#FDE68A",
  "#FCD34D",
  "#FBBF24",
  "#F59E0B",
  "#D97706",
  "#B45309",
  "#92400E",
  "#78350F",
  "#451A03",
  "#FEF2F2",
  "#FECACA",
  "#FCA5A5",
  "#F87171",
  "#EF4444",
  "#DC2626",
  "#B91C1C",
  "#991B1B",
  "#7F1D1D",
  "#450A0A",
  "#FDF2F8",
  "#FCE7F3",
  "#FBCFE8",
  "#F9A8D4",
  "#F472B6",
  "#EC4899",
  "#DB2777",
  "#BE185D",
  "#9D174D",
  "#831843",
  "#FAE8D5",
  "#E7D3BE",
  "#D6BFA6",
  "#C2A182",
  "#A67C52",
  "#8B6A4A",
  "#70543A",
  "#5B4631",
  "#4A3929",
  "#3A2E21",
];

const PALETTES: Array<{ name: string; theme: LayoutThemeSettings }> = [
  {
    name: "Neutro Clínico",
    theme: {
      sidebarBg: "#F8FAFC",
      sidebarBorder: "#CBD5E1",
      sidebarText: "#1E293B",
      topbarBg: "#FFFFFF",
      topbarBorder: "#CBD5E1",
      hoverBg: "#E2E8F0",
    },
  },
  {
    name: "Azul Premium",
    theme: {
      sidebarBg: "#EFF6FF",
      sidebarBorder: "#93C5FD",
      sidebarText: "#1E3A8A",
      topbarBg: "#F8FAFC",
      topbarBorder: "#BFDBFE",
      hoverBg: "#DBEAFE",
    },
  },
  {
    name: "Ciano Operacional",
    theme: {
      sidebarBg: "#ECFEFF",
      sidebarBorder: "#A5F3FC",
      sidebarText: "#155E75",
      topbarBg: "#F8FAFC",
      topbarBorder: "#CFFAFE",
      hoverBg: "#CFFAFE",
    },
  },
  {
    name: "Verde Suave",
    theme: {
      sidebarBg: "#ECFDF5",
      sidebarBorder: "#A7F3D0",
      sidebarText: "#065F46",
      topbarBg: "#F8FAFC",
      topbarBorder: "#D1FAE5",
      hoverBg: "#D1FAE5",
    },
  },
  {
    name: "Violeta Elegante",
    theme: {
      sidebarBg: "#F5F3FF",
      sidebarBorder: "#DDD6FE",
      sidebarText: "#5B21B6",
      topbarBg: "#FAFAF9",
      topbarBorder: "#EDE9FE",
      hoverBg: "#EDE9FE",
    },
  },
  {
    name: "Areia Premium",
    theme: {
      sidebarBg: "#FAE8D5",
      sidebarBorder: "#C2A182",
      sidebarText: "#5B4631",
      topbarBg: "#FAFAF9",
      topbarBorder: "#D6BFA6",
      hoverBg: "#E7D3BE",
    },
  },
  {
    name: "Grafite Executivo",
    theme: {
      sidebarBg: "#F1F5F9",
      sidebarBorder: "#94A3B8",
      sidebarText: "#1E293B",
      topbarBg: "#FFFFFF",
      topbarBorder: "#CBD5E1",
      hoverBg: "#CBD5E1",
    },
  },
  {
    name: "Rubi Controlado",
    theme: {
      sidebarBg: "#FEF2F2",
      sidebarBorder: "#FCA5A5",
      sidebarText: "#991B1B",
      topbarBg: "#FFFFFF",
      topbarBorder: "#FECACA",
      hoverBg: "#FECACA",
    },
  },
  {
    name: "Dourado Corporativo",
    theme: {
      sidebarBg: "#FEF3C7",
      sidebarBorder: "#FCD34D",
      sidebarText: "#78350F",
      topbarBg: "#FFFBEB",
      topbarBorder: "#FDE68A",
      hoverBg: "#FDE68A",
    },
  },
  {
    name: "Rosa Sutil",
    theme: {
      sidebarBg: "#FDF2F8",
      sidebarBorder: "#FBCFE8",
      sidebarText: "#9D174D",
      topbarBg: "#FFFFFF",
      topbarBorder: "#FCE7F3",
      hoverBg: "#FCE7F3",
    },
  },
  {
    name: "Azul Oceano",
    theme: {
      sidebarBg: "#ECFEFF",
      sidebarBorder: "#67E8F9",
      sidebarText: "#0E7490",
      topbarBg: "#F8FAFC",
      topbarBorder: "#A5F3FC",
      hoverBg: "#CFFAFE",
    },
  },
  {
    name: "Azul Profundo",
    theme: {
      sidebarBg: "#DBEAFE",
      sidebarBorder: "#60A5FA",
      sidebarText: "#1E3A8A",
      topbarBg: "#EFF6FF",
      topbarBorder: "#93C5FD",
      hoverBg: "#BFDBFE",
    },
  },
  {
    name: "Verde Atlântico",
    theme: {
      sidebarBg: "#ECFDF5",
      sidebarBorder: "#6EE7B7",
      sidebarText: "#047857",
      topbarBg: "#F8FAFC",
      topbarBorder: "#A7F3D0",
      hoverBg: "#D1FAE5",
    },
  },
  {
    name: "Verde Jade",
    theme: {
      sidebarBg: "#D1FAE5",
      sidebarBorder: "#34D399",
      sidebarText: "#065F46",
      topbarBg: "#ECFDF5",
      topbarBorder: "#6EE7B7",
      hoverBg: "#A7F3D0",
    },
  },
  {
    name: "Aço Azul",
    theme: {
      sidebarBg: "#F1F5F9",
      sidebarBorder: "#64748B",
      sidebarText: "#334155",
      topbarBg: "#FFFFFF",
      topbarBorder: "#94A3B8",
      hoverBg: "#CBD5E1",
    },
  },
  {
    name: "Lago Sereno",
    theme: {
      sidebarBg: "#EFF6FF",
      sidebarBorder: "#22D3EE",
      sidebarText: "#155E75",
      topbarBg: "#ECFEFF",
      topbarBorder: "#67E8F9",
      hoverBg: "#A5F3FC",
    },
  },
];

type ThemeField = { key: keyof LayoutThemeSettings; label: string };

const FIELDS: ThemeField[] = [
  { key: "sidebarBg", label: "Sidebar - Fundo" },
  { key: "sidebarBorder", label: "Sidebar - Borda" },
  { key: "sidebarText", label: "Sidebar - Texto/ícone" },
  { key: "hoverBg", label: "Hover dos menus" },
  { key: "topbarBg", label: "Topbar - Fundo" },
  { key: "topbarBorder", label: "Topbar - Borda" },
];

const AppearanceSettingsPage: React.FC = () => {
  const [theme, setTheme] = React.useState<LayoutThemeSettings>(() => loadLayoutTheme());

  const getContrast = (hex: string) => {
    const clean = hex.replace("#", "");
    const normalized = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 150 ? "#111827" : "#ffffff";
  };

  const set = (key: keyof LayoutThemeSettings, value: string) => {
    setTheme((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    applyLayoutTheme(theme);
    saveLayoutTheme(theme);
    toast.success("Aparência aplicada.");
  };

  const handleReset = () => {
    setTheme(DEFAULT_LAYOUT_THEME);
    applyLayoutTheme(DEFAULT_LAYOUT_THEME);
    saveLayoutTheme(DEFAULT_LAYOUT_THEME);
    toast.success("Aparência padrão restaurada.");
  };

  return (
    <PageShell>
      <PageHeader
        title="Aparência do Sistema"
        description="Personalize cores de sidebar, topbar e hover dos menus."
        icon={Palette}
        module="settings"
        breadcrumb={<>Painel &gt; Configurações &gt; Aparência</>}
      />

      <Card className="vf-surface-card no-card-lift rounded-2xl border-border/80">
        <CardHeader>
          <CardTitle className="text-base">Paleta de navegação</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 rounded-xl border border-border/80 bg-card p-3">
            <p className="mb-2 text-xs font-semibold text-foreground">Paletas prontas</p>
            <div className="flex flex-wrap gap-2">
              {PALETTES.map((palette) => (
                <Button
                  key={palette.name}
                  type="button"
                  variant="outline"
                  className="h-8 rounded-lg border text-xs"
                  style={{
                    backgroundColor: palette.theme.sidebarBg,
                    borderColor: palette.theme.sidebarBorder,
                    color: palette.theme.sidebarText,
                  }}
                  onClick={() => {
                    setTheme(palette.theme);
                    applyLayoutTheme(palette.theme);
                    saveLayoutTheme(palette.theme);
                    toast.success(`Paleta "${palette.name}" aplicada.`);
                  }}
                >
                  {palette.name}
                </Button>
              ))}
            </div>
          </div>
          {FIELDS.map((field) => (
            <div key={field.key} className="rounded-xl border border-border/80 bg-card p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <Label className="text-xs font-semibold text-foreground">{field.label}</Label>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 rounded-full border border-border" style={{ backgroundColor: theme[field.key] }} />
                  <Input
                    value={theme[field.key]}
                    onChange={(e) => set(field.key, e.target.value)}
                    className="h-7 w-24 px-2 text-xs font-mono border"
                    style={{ backgroundColor: theme[field.key], color: getContrast(theme[field.key]) }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-12 gap-1">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={`${field.key}-${color}`}
                    type="button"
                    className="h-5 w-5 rounded-full border border-border/80 transition-transform hover:scale-105"
                    style={{ backgroundColor: color }}
                    aria-label={`Aplicar cor ${color}`}
                    title={color}
                    onClick={() => set(field.key, color)}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="md:col-span-2 flex gap-2">
            <Button onClick={handleApply} className="bg-[hsl(var(--vf-settings))] text-white hover:bg-[hsl(var(--vf-settings)/0.9)]">Aplicar</Button>
            <Button variant="outline" onClick={handleReset}>Restaurar padrão</Button>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
};

export default AppearanceSettingsPage;
