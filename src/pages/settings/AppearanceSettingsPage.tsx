import React from "react";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Palette, AlertTriangle, RotateCcw, LayoutDashboard, Calendar, Users, Wallet, Eye } from "lucide-react";
import { applyLayoutTheme, DEFAULT_LAYOUT_THEME, loadLayoutTheme, saveLayoutTheme, type LayoutThemeSettings } from "@/lib/layoutTheme";

// Mesmas 100 cores de sempre (10 famílias x 10 tons, escalas no estilo
// Tailwind — já são combinações testadas), só que agora agrupadas e
// rotuladas por família em vez de uma grade única sem contexto. Pedido do
// usuário: manter a MESMA quantidade de cores, só apresentar de um jeito
// que ajude a escolher tons que combinem entre si.
const COLOR_FAMILIES: Array<{ name: string; colors: string[] }> = [
  { name: "Ardósia", colors: ["#F8FAFC", "#F1F5F9", "#E2E8F0", "#CBD5E1", "#94A3B8", "#64748B", "#475569", "#334155", "#1E293B", "#0F172A"] },
  { name: "Pedra", colors: ["#FAFAF9", "#F5F5F4", "#E7E5E4", "#D6D3D1", "#A8A29E", "#78716C", "#57534E", "#44403C", "#292524", "#1C1917"] },
  { name: "Azul", colors: ["#EFF6FF", "#DBEAFE", "#BFDBFE", "#93C5FD", "#60A5FA", "#3B82F6", "#2563EB", "#1D4ED8", "#1E40AF", "#1E3A8A"] },
  { name: "Ciano", colors: ["#ECFEFF", "#CFFAFE", "#A5F3FC", "#67E8F9", "#22D3EE", "#06B6D4", "#0891B2", "#0E7490", "#155E75", "#164E63"] },
  { name: "Esmeralda", colors: ["#ECFDF5", "#D1FAE5", "#A7F3D0", "#6EE7B7", "#34D399", "#10B981", "#059669", "#047857", "#065F46", "#064E3B"] },
  { name: "Violeta", colors: ["#F5F3FF", "#EDE9FE", "#DDD6FE", "#C4B5FD", "#A78BFA", "#8B5CF6", "#7C3AED", "#6D28D9", "#5B21B6", "#4C1D95"] },
  { name: "Âmbar", colors: ["#FEF3C7", "#FDE68A", "#FCD34D", "#FBBF24", "#F59E0B", "#D97706", "#B45309", "#92400E", "#78350F", "#451A03"] },
  { name: "Rubi", colors: ["#FEF2F2", "#FECACA", "#FCA5A5", "#F87171", "#EF4444", "#DC2626", "#B91C1C", "#991B1B", "#7F1D1D", "#450A0A"] },
  { name: "Rosa", colors: ["#FDF2F8", "#FCE7F3", "#FBCFE8", "#F9A8D4", "#F472B6", "#EC4899", "#DB2777", "#BE185D", "#9D174D", "#831843"] },
  { name: "Terracota", colors: ["#FAE8D5", "#E7D3BE", "#D6BFA6", "#C2A182", "#A67C52", "#8B6A4A", "#70543A", "#5B4631", "#4A3929", "#3A2E21"] },
];

const PALETTES: Array<{ name: string; theme: LayoutThemeSettings }> = [
  {
    name: "Neutro Clínico",
    theme: { sidebarBg: "#F8FAFC", sidebarBorder: "#CBD5E1", sidebarText: "#1E293B", topbarBg: "#FFFFFF", topbarBorder: "#CBD5E1", hoverBg: "#E2E8F0" },
  },
  {
    name: "Azul Premium",
    theme: { sidebarBg: "#EFF6FF", sidebarBorder: "#93C5FD", sidebarText: "#1E3A8A", topbarBg: "#F8FAFC", topbarBorder: "#BFDBFE", hoverBg: "#DBEAFE" },
  },
  {
    name: "Ciano Operacional",
    theme: { sidebarBg: "#ECFEFF", sidebarBorder: "#A5F3FC", sidebarText: "#155E75", topbarBg: "#F8FAFC", topbarBorder: "#CFFAFE", hoverBg: "#CFFAFE" },
  },
  {
    name: "Verde Suave",
    theme: { sidebarBg: "#ECFDF5", sidebarBorder: "#A7F3D0", sidebarText: "#065F46", topbarBg: "#F8FAFC", topbarBorder: "#D1FAE5", hoverBg: "#D1FAE5" },
  },
  {
    name: "Violeta Elegante",
    theme: { sidebarBg: "#F5F3FF", sidebarBorder: "#DDD6FE", sidebarText: "#5B21B6", topbarBg: "#FAFAF9", topbarBorder: "#EDE9FE", hoverBg: "#EDE9FE" },
  },
  {
    name: "Areia Premium",
    theme: { sidebarBg: "#FAE8D5", sidebarBorder: "#C2A182", sidebarText: "#5B4631", topbarBg: "#FAFAF9", topbarBorder: "#D6BFA6", hoverBg: "#E7D3BE" },
  },
  {
    name: "Grafite Executivo",
    theme: { sidebarBg: "#F1F5F9", sidebarBorder: "#94A3B8", sidebarText: "#1E293B", topbarBg: "#FFFFFF", topbarBorder: "#CBD5E1", hoverBg: "#CBD5E1" },
  },
  {
    name: "Rubi Controlado",
    theme: { sidebarBg: "#FEF2F2", sidebarBorder: "#FCA5A5", sidebarText: "#991B1B", topbarBg: "#FFFFFF", topbarBorder: "#FECACA", hoverBg: "#FECACA" },
  },
  {
    name: "Dourado Corporativo",
    theme: { sidebarBg: "#FEF3C7", sidebarBorder: "#FCD34D", sidebarText: "#78350F", topbarBg: "#FFFBEB", topbarBorder: "#FDE68A", hoverBg: "#FDE68A" },
  },
  {
    name: "Rosa Sutil",
    theme: { sidebarBg: "#FDF2F8", sidebarBorder: "#FBCFE8", sidebarText: "#9D174D", topbarBg: "#FFFFFF", topbarBorder: "#FCE7F3", hoverBg: "#FCE7F3" },
  },
  {
    name: "Azul Oceano",
    theme: { sidebarBg: "#ECFEFF", sidebarBorder: "#67E8F9", sidebarText: "#0E7490", topbarBg: "#F8FAFC", topbarBorder: "#A5F3FC", hoverBg: "#CFFAFE" },
  },
  {
    name: "Azul Profundo",
    theme: { sidebarBg: "#DBEAFE", sidebarBorder: "#60A5FA", sidebarText: "#1E3A8A", topbarBg: "#EFF6FF", topbarBorder: "#93C5FD", hoverBg: "#BFDBFE" },
  },
  {
    name: "Verde Atlântico",
    theme: { sidebarBg: "#ECFDF5", sidebarBorder: "#6EE7B7", sidebarText: "#047857", topbarBg: "#F8FAFC", topbarBorder: "#A7F3D0", hoverBg: "#D1FAE5" },
  },
  {
    name: "Verde Jade",
    theme: { sidebarBg: "#D1FAE5", sidebarBorder: "#34D399", sidebarText: "#065F46", topbarBg: "#ECFDF5", topbarBorder: "#6EE7B7", hoverBg: "#A7F3D0" },
  },
  {
    name: "Aço Azul",
    theme: { sidebarBg: "#F1F5F9", sidebarBorder: "#64748B", sidebarText: "#334155", topbarBg: "#FFFFFF", topbarBorder: "#94A3B8", hoverBg: "#CBD5E1" },
  },
  {
    name: "Lago Sereno",
    theme: { sidebarBg: "#EFF6FF", sidebarBorder: "#22D3EE", sidebarText: "#155E75", topbarBg: "#ECFEFF", topbarBorder: "#67E8F9", hoverBg: "#A5F3FC" },
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

// Contraste real (WCAG), usado só pra avisar o usuário se a combinação
// escolhida fica difícil de ler — diferente de getContrast() abaixo, que
// só escolhe branco/preto pro texto do campo de hex.
function relativeLuminance(hex: string) {
  const clean = hex.replace("#", "");
  const normalized = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const channels = [0, 2, 4].map((i) => parseInt(normalized.slice(i, i + 2), 16) / 255 || 0);
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const [r, g, b] = channels.map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA: string, hexB: string) {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

// WCAG AA para texto/ícone de UI em tamanho normal pede >= 3; abaixo disso
// já fica difícil de ler no dia a dia.
const MIN_CONTRAST = 3;

const PREVIEW_ICONS = [LayoutDashboard, Calendar, Users, Wallet];

const AppearanceSettingsPage: React.FC = () => {
  const [theme, setTheme] = React.useState<LayoutThemeSettings>(() => loadLayoutTheme());

  const contrastWarnings = React.useMemo(() => {
    const warnings: string[] = [];
    if (contrastRatio(theme.sidebarBg, theme.sidebarText) < MIN_CONTRAST) {
      warnings.push("Texto da sidebar pouco legível sobre o fundo escolhido.");
    }
    if (contrastRatio(theme.hoverBg, theme.sidebarText) < MIN_CONTRAST) {
      warnings.push("Texto da sidebar pouco legível sobre a cor de hover escolhida.");
    }
    return warnings;
  }, [theme.sidebarBg, theme.hoverBg, theme.sidebarText]);

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

  const resetField = (key: keyof LayoutThemeSettings) => {
    set(key, DEFAULT_LAYOUT_THEME[key]);
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

      {/* Pré-visualização ao vivo — mockup simplificado de sidebar/topbar que
          reage a cada clique num tom, antes de "Aplicar". Pedido do usuário:
          "criar uma pré-visualização antes de salvar". */}
      <Card className="vf-surface-card no-card-lift rounded-2xl border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="h-4 w-4 text-muted-foreground" /> Pré-visualização ao vivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-border/80 shadow-sm">
            <div
              className="flex h-10 items-center gap-2 border-b px-3"
              style={{ backgroundColor: theme.topbarBg, borderColor: theme.topbarBorder }}
            >
              <div className="h-2 w-24 rounded-full bg-current opacity-20" style={{ color: theme.sidebarText }} />
              <div className="ml-auto h-5 w-5 rounded-full bg-current opacity-10" style={{ color: theme.sidebarText }} />
            </div>
            <div className="flex h-40">
              <div
                className="flex w-16 flex-col items-center gap-2 border-r py-3"
                style={{ backgroundColor: theme.sidebarBg, borderColor: theme.sidebarBorder }}
              >
                {PREVIEW_ICONS.map((Icon, idx) => (
                  <div
                    key={idx}
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: idx === 1 ? theme.hoverBg : "transparent" }}
                  >
                    <Icon className="h-4 w-4" style={{ color: theme.sidebarText }} strokeWidth={1.7} />
                  </div>
                ))}
              </div>
              <div className="flex-1 bg-muted/30 p-4">
                <div className="mb-2 h-3 w-1/3 rounded-full bg-foreground/10" />
                <div className="h-2 w-2/3 rounded-full bg-foreground/10" />
                <div className="mt-1.5 h-2 w-1/2 rounded-full bg-foreground/10" />
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            O item destacado simula o efeito de hover ao passar o mouse num item do menu.
          </p>
        </CardContent>
      </Card>

      <Card className="vf-surface-card no-card-lift rounded-2xl border-border/80">
        <CardHeader>
          <CardTitle className="text-base">Paleta de navegação</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-xl border border-border/80 bg-card p-3">
            <p className="mb-2 text-xs font-semibold text-foreground">Paletas prontas</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {PALETTES.map((palette) => (
                <button
                  key={palette.name}
                  type="button"
                  className="group flex items-center gap-2.5 rounded-xl border border-border/70 bg-background p-2 text-left transition-all hover:border-primary/50 hover:shadow-sm"
                  onClick={() => {
                    setTheme(palette.theme);
                    applyLayoutTheme(palette.theme);
                    saveLayoutTheme(palette.theme);
                    toast.success(`Paleta "${palette.name}" aplicada.`);
                  }}
                >
                  <span className="flex h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-border/60">
                    <span className="h-full w-1/3" style={{ backgroundColor: palette.theme.sidebarBg }} />
                    <span className="h-full w-1/3" style={{ backgroundColor: palette.theme.hoverBg }} />
                    <span className="h-full w-1/3" style={{ backgroundColor: palette.theme.sidebarText }} />
                  </span>
                  <span className="text-xs font-medium text-foreground">{palette.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {FIELDS.map((field) => (
              <div key={field.key} className="rounded-xl border border-border/80 bg-card p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Label className="text-xs font-semibold text-foreground">{field.label}</Label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 rounded-full border border-border/70 px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                      onClick={() => resetField(field.key)}
                      title={`Restaurar cor de fábrica (${DEFAULT_LAYOUT_THEME[field.key]})`}
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span
                        className="inline-block h-3 w-3 rounded-full border border-border"
                        style={{ backgroundColor: DEFAULT_LAYOUT_THEME[field.key] }}
                      />
                      Padrão de fábrica
                    </button>
                    <Input
                      value={theme[field.key]}
                      onChange={(e) => set(field.key, e.target.value)}
                      className="h-7 w-24 px-2 text-xs font-mono border"
                      style={{ backgroundColor: theme[field.key], color: getContrast(theme[field.key]) }}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  {COLOR_FAMILIES.map((family) => (
                    <div key={family.name} className="flex items-center gap-2">
                      <span className="w-14 shrink-0 text-[10px] text-muted-foreground">{family.name}</span>
                      <div className="flex flex-1 gap-1">
                        {family.colors.map((color) => {
                          const selected = theme[field.key].toLowerCase() === color.toLowerCase();
                          return (
                            <button
                              key={`${field.key}-${color}`}
                              type="button"
                              className="h-5 flex-1 rounded-md border transition-transform hover:scale-110"
                              style={{
                                backgroundColor: color,
                                borderColor: selected ? "hsl(var(--primary))" : "transparent",
                                boxShadow: selected ? "0 0 0 2px hsl(var(--primary) / 0.35)" : undefined,
                              }}
                              aria-label={`Aplicar cor ${color}`}
                              title={color}
                              onClick={() => set(field.key, color)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {contrastWarnings.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Contraste baixo nesta combinação de cores:</p>
                <ul className="mt-1 list-disc pl-4">
                  {contrastWarnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={handleApply} className="bg-[hsl(var(--vf-settings))] text-white hover:bg-[hsl(var(--vf-settings)/0.9)]">Aplicar</Button>
            <Button variant="outline" onClick={handleReset}>Restaurar padrão (tudo)</Button>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
};

export default AppearanceSettingsPage;
