import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { toast } from "sonner";
import { hemogramReferences as defaultRefs } from "@/constants/examReferences";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { SectionCard } from "@/components/saas/SectionCard";
import { FlaskConical } from "lucide-react";

type Species = "dog" | "cat";

type RefValue = {
  full?: string;
  min?: number;
  max?: number;
  relative?: string;
  absolute?: string;
};

type HemogramRefsShape = Record<string, { dog: RefValue; cat: RefValue }>;

type BiochemEntry = {
  unit: string;
  dog: { min?: number; max?: number };
  cat: { min?: number; max?: number };
};

type BiochemicalRefsShape = Record<string, BiochemEntry>;

type RefsState = {
  hemogram: HemogramRefsShape;
  biochemical: BiochemicalRefsShape;
};

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

// Lista inicial de analitos bioquímicos comuns
const DEFAULT_BIOCHEMICALS = [
  "Ureia",
  "Creatinina",
  "ALT (TGP)",
  "AST (TGO)",
  "ALP (Fosfatase Alcalina)",
  "GGT",
  "CK (CPK)",
  "Amilase",
  "Lipase",
  "Glicose",
  "Colesterol",
  "Triglicerídeos",
  "Bilirrubina total",
  "Bilirrubina direta",
  "Proteínas totais",
  "Albumina",
  "Cálcio",
  "Fósforo",
  "Frutosamina",
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

const getInitialHemogramRefs = (): HemogramRefsShape => {
  const cloned: HemogramRefsShape = {} as any;
  for (const key of Object.keys(defaultRefs)) {
    const k = key as keyof typeof defaultRefs;
    cloned[key] = {
      dog: { ...defaultRefs[k].dog },
      cat: { ...defaultRefs[k].cat },
    };
  }
  return cloned;
};

const getInitialBiochemicalRefs = (): BiochemicalRefsShape => {
  const initial: BiochemicalRefsShape = {};
  DEFAULT_BIOCHEMICALS.forEach((name) => {
    initial[name] = {
      unit: "",
      dog: { min: undefined, max: undefined },
      cat: { min: undefined, max: undefined },
    };
  });
  return initial;
};

const loadRefs = (): RefsState => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const hemogramBase = getInitialHemogramRefs();
    const biochemicalBase = getInitialBiochemicalRefs();

    if (!raw) {
      return { hemogram: hemogramBase, biochemical: biochemicalBase };
    }

    const parsed = JSON.parse(raw);

    // Migração: se vier na estrutura antiga (apenas hemogram flat), adaptar
    if (!parsed.hemogram && !parsed.biochemical) {
      const oldFlat = parsed as HemogramRefsShape;
      const hemogramMerged: HemogramRefsShape = { ...hemogramBase };
      for (const key of Object.keys(hemogramBase)) {
        if (oldFlat[key]) {
          hemogramMerged[key] = {
            dog: { ...hemogramBase[key].dog, ...oldFlat[key].dog },
            cat: { ...hemogramBase[key].cat, ...oldFlat[key].cat },
          };
        }
      }
      return { hemogram: hemogramMerged, biochemical: biochemicalBase };
    }

    // Estrutura nova
    const hemogramMerged: HemogramRefsShape = { ...hemogramBase };
    for (const key of Object.keys(hemogramBase)) {
      const incoming = parsed.hemogram?.[key];
      if (incoming) {
        hemogramMerged[key] = {
          dog: { ...hemogramBase[key].dog, ...incoming.dog },
          cat: { ...hemogramBase[key].cat, ...incoming.cat },
        };
      }
    }

    const biochemicalMerged: BiochemicalRefsShape = { ...biochemicalBase };
    const incomingBiochem = parsed.biochemical || {};
    for (const name of Object.keys(incomingBiochem)) {
      const inc = incomingBiochem[name];
      biochemicalMerged[name] = {
        unit: inc.unit || "",
        dog: { min: inc.dog?.min, max: inc.dog?.max },
        cat: { min: inc.cat?.min, max: inc.cat?.max },
      };
    }

    return { hemogram: hemogramMerged, biochemical: biochemicalMerged };
  } catch {
    return { hemogram: getInitialHemogramRefs(), biochemical: getInitialBiochemicalRefs() };
  }
};

const ExamReferencesPage: React.FC = () => {
  const [refs, setRefs] = useState<RefsState>(() => loadRefs());

  // Para adicionar rapidamente novo analito bioquímico
  const [newBiochemName, setNewBiochemName] = useState("");
  const [newBiochemUnit, setNewBiochemUnit] = useState("");

  // Funções de atualização (hemograma/plaquetas)
  const onChangeNonLeuko = (paramKey: string, species: Species, field: "min" | "max" | "unit", value: string) => {
    setRefs(prev => {
      const next: RefsState = { ...prev, hemogram: { ...prev.hemogram } };
      const currentSpecies = { ...(next.hemogram[paramKey]?.[species] || {}) };
      if (field === "min") currentSpecies.min = value ? Number(value) : undefined;
      if (field === "max") currentSpecies.max = value ? Number(value) : undefined;

      // Extrair unidade atual da full, se houver
      let existingUnit = (currentSpecies.full || "").trim().split(" ").pop() || "";
      if (field === "unit") {
        existingUnit = value || "";
      }
      const minStr = currentSpecies.min !== undefined ? currentSpecies.min : undefined;
      const maxStr = currentSpecies.max !== undefined ? currentSpecies.max : undefined;
      currentSpecies.full = formatFull(minStr, maxStr, existingUnit);

      next.hemogram[paramKey] = { ...next.hemogram[paramKey], [species]: currentSpecies } as any;
      return next;
    });
  };

  // Funções de atualização (leucograma)
  const onChangeLeuko = (
    paramKey: string,
    species: Species,
    part: "relative" | "absolute",
    field: "min" | "max" | "unit",
    value: string
  ) => {
    setRefs(prev => {
      const next: RefsState = { ...prev, hemogram: { ...prev.hemogram } };
      const currentSpecies = { ...(next.hemogram[paramKey]?.[species] || {}) };

      const existing = (currentSpecies[part] || "").trim();
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

      currentSpecies[part] = built;

      // Atualizar min/max numéricos com base no absoluto (para indicadores)
      if (part === "absolute") {
        const numMin = existingMin ? Number(existingMin.replace(/\./g, "").replace(",", ".")) : undefined;
        const numMax = existingMax ? Number(existingMax.replace(/\./g, "").replace(",", ".")) : undefined;
        currentSpecies.min = numMin;
        currentSpecies.max = numMax;
      }

      next.hemogram[paramKey] = { ...next.hemogram[paramKey], [species]: currentSpecies } as any;
      return next;
    });
  };

  // Bioquímico: adicionar, remover, atualizar
  const handleAddBiochemical = () => {
    const name = newBiochemName.trim();
    const unit = newBiochemUnit.trim();
    if (!name) {
      toast.error("Informe o nome do analito bioquímico.");
      return;
    }
    setRefs(prev => {
      if (prev.biochemical[name]) {
        toast.error("Esse analito já existe.");
        return prev;
      }
      const next: RefsState = { ...prev, biochemical: { ...prev.biochemical } };
      next.biochemical[name] = {
        unit,
        dog: { min: undefined, max: undefined },
        cat: { min: undefined, max: undefined },
      };
      return next;
    });
    setNewBiochemName("");
    setNewBiochemUnit("");
    toast.success("Analito adicionado.");
  };

  const handleRemoveBiochemical = (name: string) => {
    setRefs(prev => {
      const next: RefsState = { ...prev, biochemical: { ...prev.biochemical } };
      delete next.biochemical[name];
      return next;
    });
    toast.success("Analito removido.");
  };

  const updateBiochemical = (
    name: string,
    species: Species | "unit",
    field: "min" | "max" | "unit",
    value: string
  ) => {
    setRefs(prev => {
      const entry = prev.biochemical[name];
      if (!entry) return prev;
      const next: RefsState = { ...prev, biochemical: { ...prev.biochemical } };
      const copy = { ...entry };
      if (species === "unit") {
        copy.unit = value;
      } else {
        const bucket = { ...(species === "dog" ? copy.dog : copy.cat) };
        if (field === "min") bucket.min = value ? Number(value) : undefined;
        if (field === "max") bucket.max = value ? Number(value) : undefined;
        if (species === "dog") copy.dog = bucket; else copy.cat = bucket;
      }
      next.biochemical[name] = copy;
      return next;
    });
  };

  const handleSave = () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(refs));
    toast.success("Referências de exame salvas com sucesso.");
  };

  const renderedNonLeukoRows = useMemo(() => {
    return NON_LEUKO_KEYS.map((key) => {
      const dog = refs.hemogram[key]?.dog || {};
      const cat = refs.hemogram[key]?.cat || {};
      const dogUnit = (dog.full || "").trim().split(" ").pop() || "";
      const catUnit = (cat.full || "").trim().split(" ").pop() || "";

      const label = key.replace(/([A-Z])/g, " $1");

      return (
        <div key={`nl-${key}`} className="grid grid-cols-1 sm:grid-cols-7 gap-2 items-end">
          <div className="sm:col-span-1">
            <Label className="text-xs font-medium capitalize">{label}</Label>
          </div>

          {/* Cão */}
          <Input
            value={dog.min ?? ""}
            onChange={(e) => onChangeNonLeuko(key, "dog", "min", e.target.value)}
            placeholder="Cão mín."
            className="bg-amber-50/40 h-8 text-sm"
          />
          <Input
            value={dog.max ?? ""}
            onChange={(e) => onChangeNonLeuko(key, "dog", "max", e.target.value)}
            placeholder="Cão máx."
            className="bg-amber-50/40 h-8 text-sm"
          />
          <Input
            value={dogUnit}
            onChange={(e) => onChangeNonLeuko(key, "dog", "unit", e.target.value)}
            placeholder="Unid. cão"
            className="bg-amber-50/40 h-8 text-sm"
          />

          {/* Gato */}
          <Input
            value={cat.min ?? ""}
            onChange={(e) => onChangeNonLeuko(key, "cat", "min", e.target.value)}
            placeholder="Gato mín."
            className="bg-sky-50/40 h-8 text-sm"
          />
          <Input
            value={cat.max ?? ""}
            onChange={(e) => onChangeNonLeuko(key, "cat", "max", e.target.value)}
            placeholder="Gato máx."
            className="bg-sky-50/40 h-8 text-sm"
          />
          <Input
            value={catUnit}
            onChange={(e) => onChangeNonLeuko(key, "cat", "unit", e.target.value)}
            placeholder="Unid. gato"
            className="bg-sky-50/40 h-8 text-sm"
          />
        </div>
      );
    });
  }, [refs]);

  const renderedLeukoRows = useMemo(() => {
    return LEUKO_KEYS.map((key) => {
      const dog = refs.hemogram[key]?.dog || {};
      const cat = refs.hemogram[key]?.cat || {};

      const parseRange = (raw?: string) => {
        const t = (raw || "").trim();
        const m = t.match(/^(\S+)\s*-\s*(\S+)\s*(\S*)$/);
        if (m) return { min: m[1], max: m[2], unit: m[3] || "" };
        const m2 = t.match(/^(\S+)\s*(\S*)$/);
        if (m2) return { min: m2[1], max: "", unit: m2[2] || "" };
        return { min: "", max: "", unit: "" };
      };

      const dogRel = parseRange(dog.relative);
      const dogAbs = parseRange(dog.absolute);
      const catRel = parseRange(cat.relative);
      const catAbs = parseRange(cat.absolute);

      const label = key.replace(/([A-Z])/g, " $1");

      return (
        <div key={`lk-${key}`} className="space-y-1">
          {/* Relativo */}
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 items-end">
            <div className="sm:col-span-1">
              <Label className="text-xs font-medium capitalize">{label} (Rel.)</Label>
            </div>
            <Input value={dogRel.min} onChange={(e) => onChangeLeuko(key, "dog", "relative", "min", e.target.value)} placeholder="Cão mín." className="bg-amber-50/40 h-8 text-sm" />
            <Input value={dogRel.max} onChange={(e) => onChangeLeuko(key, "dog", "relative", "max", e.target.value)} placeholder="Cão máx." className="bg-amber-50/40 h-8 text-sm" />
            <Input value={dogRel.unit} onChange={(e) => onChangeLeuko(key, "dog", "relative", "unit", e.target.value)} placeholder="Unid. cão" className="bg-input h-8 text-sm" />
            <Input value={catRel.min} onChange={(e) => onChangeLeuko(key, "cat", "relative", "min", e.target.value)} placeholder="Gato mín." className="bg-sky-50/40 h-8 text-sm" />
            <Input value={catRel.max} onChange={(e) => onChangeLeuko(key, "cat", "relative", "max", e.target.value)} placeholder="Gato máx." className="bg-sky-50/40 h-8 text-sm" />
            <Input value={catRel.unit} onChange={(e) => onChangeLeuko(key, "cat", "relative", "unit", e.target.value)} placeholder="Unid. gato" className="bg-input h-8 text-sm" />
          </div>

          {/* Absoluto */}
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 items-end">
            <div className="sm:col-span-1">
              <Label className="text-xs font-medium capitalize">{label} (Abs.)</Label>
            </div>
            <Input value={dogAbs.min} onChange={(e) => onChangeLeuko(key, "dog", "absolute", "min", e.target.value)} placeholder="Cão mín." className="bg-amber-50/40 h-8 text-sm" />
            <Input value={dogAbs.max} onChange={(e) => onChangeLeuko(key, "dog", "absolute", "max", e.target.value)} placeholder="Cão máx." className="bg-amber-50/40 h-8 text-sm" />
            <Input value={dogAbs.unit} onChange={(e) => onChangeLeuko(key, "dog", "absolute", "unit", e.target.value)} placeholder="Unid. cão" className="bg-input h-8 text-sm" />
            <Input value={catAbs.min} onChange={(e) => onChangeLeuko(key, "cat", "absolute", "min", e.target.value)} placeholder="Gato mín." className="bg-sky-50/40 h-8 text-sm" />
            <Input value={catAbs.max} onChange={(e) => onChangeLeuko(key, "cat", "absolute", "max", e.target.value)} placeholder="Gato máx." className="bg-sky-50/40 h-8 text-sm" />
            <Input value={catAbs.unit} onChange={(e) => onChangeLeuko(key, "cat", "absolute", "unit", e.target.value)} placeholder="Unid. gato" className="bg-input h-8 text-sm" />
          </div>
        </div>
      );
    });
  }, [refs]);

  const biochemicalNames = useMemo(() => Object.keys(refs.biochemical).sort((a, b) => a.localeCompare(b)), [refs.biochemical]);

  return (
    <PageShell>
      <PageHeader
        title="Referências de Exames"
        description="Defina valores mínimos, máximos e unidades por espécie para hemograma e bioquímicos."
        icon={FlaskConical}
        module="registry"
        breadcrumb={<>Painel &gt; Cadastros &gt; Referências de Exames</>}
      />

      <SectionCard title="Gerenciar referências" description="Ajuste faixas de hemograma e bioquímica por espécie." icon={FlaskConical} tone="registry">
      <Card className="vf-surface-card vf-tone-registry card-hover rounded-2xl border border-border/80">
        <CardHeader className="py-3">
          <CardTitle className="flex items-center justify-between text-base sm:text-lg">
            <span>Gerenciar Referências</span>
            <div className="flex gap-2">
              <Button onClick={handleSave} className="h-8 bg-[hsl(var(--vf-registry))] px-3 text-sm text-white hover:bg-[hsl(var(--vf-registry)/0.9)]">Salvar</Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <Accordion type="multiple" className="w-full space-y-2">
            <AccordionItem value="eritrograma" className="overflow-hidden !border-b-0 rounded-xl border border-amber-300/55 bg-amber-50/35">
              <AccordionTrigger className="px-3 text-sm font-semibold text-foreground hover:bg-amber-100/75 hover:no-underline data-[state=open]:bg-amber-100/85">Eritrograma e Plaquetas</AccordionTrigger>
              <AccordionContent className="space-y-2 px-3">
                <div className="grid gap-1">
                  {/* Cabeçalho compacto */}
                  <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
                    <div />
                    <div className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Cão mín.</div>
                    <div className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Cão máx.</div>
                    <div className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Unid. cão</div>
                    <div className="rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800">Gato mín.</div>
                    <div className="rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800">Gato máx.</div>
                    <div className="rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800">Unid. gato</div>
                  </div>
                  {renderedNonLeukoRows}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="leucograma" className="overflow-hidden !border-b-0 rounded-xl border border-sky-300/55 bg-sky-50/35">
              <AccordionTrigger className="px-3 text-sm font-semibold text-foreground hover:bg-sky-100/75 hover:no-underline data-[state=open]:bg-sky-100/85">Leucograma (Relativo e Absoluto)</AccordionTrigger>
              <AccordionContent className="space-y-2 px-3">
                <div className="grid gap-1">
                  {/* Cabeçalho compacto */}
                  <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
                    <div />
                    <div className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Cão mín.</div>
                    <div className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Cão máx.</div>
                    <div className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Unid. cão</div>
                    <div className="rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800">Gato mín.</div>
                    <div className="rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800">Gato máx.</div>
                    <div className="rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800">Unid. gato</div>
                  </div>
                  {renderedLeukoRows}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="bioquimico" className="overflow-hidden !border-b-0 rounded-xl border border-violet-300/55 bg-violet-50/35">
              <AccordionTrigger className="px-3 text-sm font-semibold text-foreground hover:bg-violet-100/75 hover:no-underline data-[state=open]:bg-violet-100/85">Bioquímico</AccordionTrigger>
              <AccordionContent className="space-y-3 px-3">
                {/* Adicionar novo analito */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Nome do Analito</Label>
                    <Input
                      value={newBiochemName}
                      onChange={(e) => setNewBiochemName(e.target.value)}
                      placeholder="Ex.: Ureia, ALT (TGP)"
                      className="bg-input h-8 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Unidade</Label>
                    <Input
                      value={newBiochemUnit}
                      onChange={(e) => setNewBiochemUnit(e.target.value)}
                      placeholder="Ex.: mg/dL, U/L"
                      className="bg-input h-8 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-1 flex">
                    <Button onClick={handleAddBiochemical} className="h-8 w-full bg-[hsl(var(--vf-registry))] px-3 text-sm text-white hover:bg-[hsl(var(--vf-registry)/0.9)]">Adicionar</Button>
                  </div>
                </div>

                {/* Cabeçalho da tabela */}
                <div className="grid grid-cols-1 sm:grid-cols-8 gap-2 items-center">
                  <div className="sm:col-span-2 rounded-md bg-violet-100/70 px-2 py-1 text-xs font-semibold text-violet-800">Nome</div>
                  <div className="rounded-md bg-violet-100/70 px-2 py-1 text-xs font-semibold text-violet-800">Unidade</div>
                  <div className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Cão mín.</div>
                  <div className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Cão máx.</div>
                  <div className="rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800">Gato mín.</div>
                  <div className="rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800">Gato máx.</div>
                  <div className="rounded-md bg-violet-100/70 px-2 py-1 text-xs font-semibold text-violet-800">Ações</div>
                </div>

                {/* Linhas dos analitos */}
                <div className="space-y-1">
                  {biochemicalNames.map((name) => {
                    const entry = refs.biochemical[name];
                    return (
                      <div key={`bio-${name}`} className="grid grid-cols-1 sm:grid-cols-8 gap-2 items-end">
                        <div className="sm:col-span-2">
                          <Input
                            value={name}
                            readOnly
                            className="bg-input h-8 text-sm"
                          />
                        </div>
                        <Input
                          value={entry.unit}
                          onChange={(e) => updateBiochemical(name, "unit", "unit", e.target.value)}
                          placeholder="Unidade"
                          className="bg-input h-8 text-sm"
                        />
                        <Input
                          value={entry.dog.min ?? ""}
                          onChange={(e) => updateBiochemical(name, "dog", "min", e.target.value)}
                          placeholder="Cão mín."
                          className="bg-amber-50/40 h-8 text-sm"
                        />
                        <Input
                          value={entry.dog.max ?? ""}
                          onChange={(e) => updateBiochemical(name, "dog", "max", e.target.value)}
                          placeholder="Cão máx."
                          className="bg-amber-50/40 h-8 text-sm"
                        />
                        <Input
                          value={entry.cat.min ?? ""}
                          onChange={(e) => updateBiochemical(name, "cat", "min", e.target.value)}
                          placeholder="Gato mín."
                          className="bg-sky-50/40 h-8 text-sm"
                        />
                        <Input
                          value={entry.cat.max ?? ""}
                          onChange={(e) => updateBiochemical(name, "cat", "max", e.target.value)}
                          placeholder="Gato máx."
                          className="bg-sky-50/40 h-8 text-sm"
                        />
                        <div className="sm:col-span-1 flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleRemoveBiochemical(name)}
                            className="h-8 px-3 text-sm w-full"
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
      </SectionCard>
    </PageShell>
  );
};

export default ExamReferencesPage;