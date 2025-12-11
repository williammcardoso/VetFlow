import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { toast } from "sonner";
import { hemogramReferences as defaultRefs } from "@/constants/examReferences";

type Species = "dog" | "cat";

type RefValue = {
  // Para eritrograma/plaquetas: usamos min/max/unit -> gera full
  full?: string;
  min?: number;
  max?: number;
  // Para leucócitos: usamos relative/absolute como strings
  relative?: string;
  absolute?: string;
};

type RefsShape = Record<string, { dog: RefValue; cat: RefValue }>;

const LOCAL_STORAGE_KEY = "examReferences";

const NON_LEUKO_KEYS = [
  "eritrocitos",
  "hemoglobina",
  "hematocrito",
  "vcm",
  "hcm",
  "chcm",
  "proteinaTotal",
  "hemaciasNucleadas",
  "contagemPlaquetaria",
];

const LEUKO_KEYS = [
  "leucocitosTotais",
  "mielocitos",
  "metamielocitos",
  "bastonetes",
  "segmentados",
  "eosinofilos",
  "basofilos",
  "linfocitos",
  "monocitos",
];

const formatFull = (min?: string | number, max?: string | number, unit?: string) => {
  const minStr = typeof min === "number" ? String(min) : (min || "").trim();
  const maxStr = typeof max === "number" ? String(max) : (max || "").trim();
  const unitStr = (unit || "").trim();
  if (!minStr && !maxStr && !unitStr) return "";
  if (minStr && maxStr) return `${minStr} - ${maxStr} ${unitStr}`.trim();
  if (minStr && !maxStr) return `${minStr} ${unitStr}`.trim();
  if (!minStr && maxStr) return `${maxStr} ${unitStr}`.trim();
  return unitStr;
};

const getInitialRefs = (): RefsShape => {
  // Clona os defaults para edição
  const cloned: RefsShape = {} as any;
  for (const key of Object.keys(defaultRefs)) {
    const k = key as keyof typeof defaultRefs;
    cloned[key] = {
      dog: { ...defaultRefs[k].dog },
      cat: { ...defaultRefs[k].cat },
    };
  }
  return cloned;
};

const loadRefs = (): RefsShape => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return getInitialRefs();
    const parsed = JSON.parse(raw);
    // Mescla com defaults para garantir chaves existentes
    const base = getInitialRefs();
    for (const key of Object.keys(base)) {
      if (!parsed[key]) parsed[key] = base[key];
      else {
        parsed[key].dog = { ...base[key].dog, ...parsed[key].dog };
        parsed[key].cat = { ...base[key].cat, ...parsed[key].cat };
      }
    }
    return parsed;
  } catch {
    return getInitialRefs();
  }
};

const ExamReferencesPage: React.FC = () => {
  const [refs, setRefs] = useState<RefsShape>(() => loadRefs());
  const [activeSpecies, setActiveSpecies] = useState<Species>("dog");

  useEffect(() => {
    // Ao montar, garantir estrutura
    setRefs(loadRefs());
  }, []);

  const onChangeNonLeuko = (paramKey: string, species: Species, field: "min" | "max" | "unit", value: string) => {
    setRefs(prev => {
      const next = { ...prev };
      const current = { ...(next[paramKey]?.[species] || {}) };
      // Guardar min/max como número, unidade como parte de full
      if (field === "min") current.min = value ? Number(value) : undefined;
      if (field === "max") current.max = value ? Number(value) : undefined;
      if (field === "unit") {
        // recalcular full usando min/max + unit
        const unit = value || "";
        const minStr = current.min !== undefined ? current.min : undefined;
        const maxStr = current.max !== undefined ? current.max : undefined;
        current.full = formatFull(minStr, maxStr, unit);
      } else {
        // quando altera min/max sem mexer na unit, tentar extrair unidade da full existente
        const existingUnit = (current.full || "").split(" ").pop() || "";
        const minStr = current.min !== undefined ? current.min : undefined;
        const maxStr = current.max !== undefined ? current.max : undefined;
        current.full = formatFull(minStr, maxStr, existingUnit);
      }
      next[paramKey] = { ...next[paramKey], [species]: current };
      return next;
    });
  };

  const onChangeLeuko = (
    paramKey: string,
    species: Species,
    part: "relative" | "absolute",
    field: "min" | "max" | "unit",
    value: string
  ) => {
    setRefs(prev => {
      const next = { ...prev };
      const current = { ...(next[paramKey]?.[species] || {}) };
      // Fazer parse da string existente
      const existing = (current[part] || "").trim();
      let existingMin = "";
      let existingMax = "";
      let existingUnit = "";
      const m = existing.match(/^(\S+)\s*-\s*(\S+)\s*(\S*)$/);
      if (m) {
        existingMin = m[1] || "";
        existingMax = m[2] || "";
        existingUnit = m[3] || "";
      } else {
        const m2 = existing.match(/^(\S+)\s*(\S*)$/);
        if (m2) {
          existingMin = m2[1] || "";
          existingUnit = m2[2] || "";
        }
      }

      if (field === "min") existingMin = value || "";
      if (field === "max") existingMax = value || "";
      if (field === "unit") existingUnit = value || "";

      const built = existingMax
        ? `${existingMin} - ${existingMax} ${existingUnit}`.trim()
        : `${existingMin} ${existingUnit}`.trim();

      current[part] = built;

      // Também atualizar min/max numéricos só para absoluto (usado em indicadores)
      if (part === "absolute") {
        const numMin = existingMin ? Number(existingMin.replace(/\./g, "").replace(",", ".")) : undefined;
        const numMax = existingMax ? Number(existingMax.replace(/\./g, "").replace(",", ".")) : undefined;
        current.min = numMin;
        current.max = numMax;
      }

      next[paramKey] = { ...next[paramKey], [species]: current };
      return next;
    });
  };

  const handleSave = () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(refs));
    toast.success("Referências de exame salvas com sucesso.");
  };

  const handleReset = () => {
    const initial = getInitialRefs();
    setRefs(initial);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
    toast.success("Referências restauradas para os valores padrão.");
  };

  const SpeciesToggle = useMemo(() => (
    <Tabs value={activeSpecies} onValueChange={(v) => setActiveSpecies(v as Species)} className="w-full">
      <TabsList className="grid grid-cols-2 w-full">
        <TabsTrigger value="dog">Cão</TabsTrigger>
        <TabsTrigger value="cat">Gato</TabsTrigger>
      </TabsList>
      <TabsContent value="dog" />
      <TabsContent value="cat" />
    </Tabs>
  ), [activeSpecies]);

  return (
    <div className="flex flex-col min-h-screen bg-background p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Referências de Exames</h1>
        <p className="text-sm text-muted-foreground">Cadastre os valores mínimos, máximos e unidade por espécie. Para leucócitos, preencha referências relativas e absolutas.</p>
      </div>

      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Espécies</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset}>Restaurar padrão</Button>
              <Button onClick={handleSave}>Salvar</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {SpeciesToggle}

          <Accordion type="multiple" className="w-full">
            <AccordionItem value="eritrograma">
              <AccordionTrigger>Eritrograma e Plaquetas</AccordionTrigger>
              <AccordionContent className="space-y-4">
                {NON_LEUKO_KEYS.map((key) => {
                  const current = refs[key]?.[activeSpecies] || {};
                  // Extrair unidade da full existente (última palavra), se houver
                  const unitGuess = (current.full || "").trim().split(" ").pop() || "";
                  return (
                    <div key={`${key}-${activeSpecies}`} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                      <div className="md:col-span-1">
                        <Label className="text-sm font-medium capitalize">{key.replaceAll(/([A-Z])/g, " $1")}</Label>
                      </div>
                      <div className="space-y-1">
                        <Label>Mín.</Label>
                        <Input
                          value={current.min ?? ""}
                          onChange={(e) => onChangeNonLeuko(key, activeSpecies, "min", e.target.value)}
                          placeholder="Ex.: 4.7"
                          className="bg-input"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Máx.</Label>
                        <Input
                          value={current.max ?? ""}
                          onChange={(e) => onChangeNonLeuko(key, activeSpecies, "max", e.target.value)}
                          placeholder="Ex.: 6.8"
                          className="bg-input"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Unidade</Label>
                        <Input
                          value={unitGuess}
                          onChange={(e) => onChangeNonLeuko(key, activeSpecies, "unit", e.target.value)}
                          placeholder="Ex.: g/dL, /µL, %"
                          className="bg-input"
                        />
                      </div>
                    </div>
                  );
                })}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="leucograma">
              <AccordionTrigger>Leucograma (Relativo e Absoluto)</AccordionTrigger>
              <AccordionContent className="space-y-6">
                {LEUKO_KEYS.map((key) => {
                  const current = refs[key]?.[activeSpecies] || {};
                  // Parse existentes para relative
                  const parseRange = (raw?: string) => {
                    const t = (raw || "").trim();
                    const m = t.match(/^(\S+)\s*-\s*(\S+)\s*(\S*)$/);
                    if (m) return { min: m[1], max: m[2], unit: m[3] || "" };
                    const m2 = t.match(/^(\S+)\s*(\S*)$/);
                    if (m2) return { min: m2[1], max: "", unit: m2[2] || "" };
                    return { min: "", max: "", unit: "" };
                  };
                  const rel = parseRange(current.relative);
                  const abs = parseRange(current.absolute);

                  return (
                    <div key={`${key}-${activeSpecies}`} className="space-y-3">
                      <Label className="text-sm font-medium capitalize">{key.replaceAll(/([A-Z])/g, " $1")}</Label>
                      {/* Relativo */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <div className="md:col-span-1">
                          <span className="text-xs text-muted-foreground">Relativo</span>
                        </div>
                        <div className="space-y-1">
                          <Label>Mín.</Label>
                          <Input
                            value={rel.min}
                            onChange={(e) => onChangeLeuko(key, activeSpecies, "relative", "min", e.target.value)}
                            placeholder="Ex.: 60"
                            className="bg-input"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Máx.</Label>
                          <Input
                            value={rel.max}
                            onChange={(e) => onChangeLeuko(key, activeSpecies, "relative", "max", e.target.value)}
                            placeholder="Ex.: 77"
                            className="bg-input"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Unidade</Label>
                          <Input
                            value={rel.unit}
                            onChange={(e) => onChangeLeuko(key, activeSpecies, "relative", "unit", e.target.value)}
                            placeholder="Ex.: %"
                            className="bg-input"
                          />
                        </div>
                      </div>

                      {/* Absoluto */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <div className="md:col-span-1">
                          <span className="text-xs text-muted-foreground">Absoluto</span>
                        </div>
                        <div className="space-y-1">
                          <Label>Mín.</Label>
                          <Input
                            value={abs.min}
                            onChange={(e) => onChangeLeuko(key, activeSpecies, "absolute", "min", e.target.value)}
                            placeholder="Ex.: 3000"
                            className="bg-input"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Máx.</Label>
                          <Input
                            value={abs.max}
                            onChange={(e) => onChangeLeuko(key, activeSpecies, "absolute", "max", e.target.value)}
                            placeholder="Ex.: 11500"
                            className="bg-input"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Unidade</Label>
                          <Input
                            value={abs.unit}
                            onChange={(e) => onChangeLeuko(key, activeSpecies, "absolute", "unit", e.target.value)}
                            placeholder="Ex.: /µL"
                            className="bg-input"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExamReferencesPage;