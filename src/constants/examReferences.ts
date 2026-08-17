import { supabase } from "@/integrations/supabase/client";
import { HemogramReference, HemogramReferenceValue } from "@/types/exam";

// Chave antiga (localStorage) — cada navegador/dispositivo tinha a sua
// própria cópia, então o celular podia mostrar referências diferentes do
// computador (dado incorreto ao usar de outro aparelho). Mantida só como
// origem da migração automática pra Supabase na primeira leitura, e como
// cache local de leitura offline depois disso.
const LEGACY_STORAGE_KEY = "examReferences";
const CACHE_STORAGE_KEY = "examReferences:cache";
const SETTINGS_TABLE = "settings";
const SETTINGS_KEY = "examReferences";

/** Referências padrão (usadas quando não há nada cadastrado ainda) */
const defaultHemogramReferences: Record<string, HemogramReference> = {
  eritrocitos: { dog: { full: "5.5 - 8.5 M/µL", min: 5.5, max: 8.5 }, cat: { full: "6.5 - 10.0 M/µL", min: 6.5, max: 10.0 } },
  hemoglobina: { dog: { full: "12.0 - 18.0 g/dL", min: 12.0, max: 18.0 }, cat: { full: "9.0 - 15.0 g/dL", min: 9.0, max: 15.0 } },
  hematocrito: { dog: { full: "37 - 55 %", min: 37, max: 55 }, cat: { full: "30 - 45 %", min: 30, max: 45 } },
  vcm: { dog: { full: "60.0 - 77.0 fL", min: 60.0, max: 77.0 }, cat: { full: "39.0 - 55.0 fL", min: 39.0, max: 55.0 } },
  hcm: { dog: { full: "19.5 - 24.5 pg", min: 19.5, max: 24.5 }, cat: { full: "13.0 - 17.0 pg", min: 13.0, max: 17.0 } },
  chcm: { dog: { full: "31 - 35 %", min: 31, max: 35 }, cat: { full: "30 - 36 %", min: 30, max: 36 } },
  rdw: { dog: { full: "11.5 - 14.5 %", min: 11.5, max: 14.5 }, cat: { full: "11.5 - 14.5 %", min: 11.5, max: 14.5 } },
  proteinaTotal: { dog: { full: "6.0 - 8.0 g/dL", min: 6.0, max: 8.0 }, cat: { full: "5.7 - 8.9 g/dL", min: 5.7, max: 8.9 } },
  hemaciasNucleadas: { dog: { full: "0", min: 0, max: 0 }, cat: { full: "0", min: 0, max: 0 } },

  leucocitosTotais: {
    dog: {
      relative: "0 - 100 %",
      absolute: "6.0 - 17.0 /µL", // ALTERADO: Removido 'mil'
      min: 6.0,
      max: 17.0
    },
    cat: {
      relative: "0 - 100 %",
      absolute: "5.5 - 19.5 /µL", // ALTERADO: Removido 'mil'
      min: 5.5,
      max: 19.5
    }
  },
  mielocitos: {
    dog: { relative: "0 - 0 %", absolute: "0 - 0 /µL", min: 0, max: 0 },
    cat: { relative: "0 - 0 %", absolute: "0 - 0 /µL", min: 0, max: 0 }
  },
  metamielocitos: {
    dog: { relative: "0 - 0 %", absolute: "0 - 0 /µL", min: 0, max: 0 },
    cat: { relative: "0 - 0 %", absolute: "0 - 0 /µL", min: 0, max: 0 }
  },
  bastonetes: {
    dog: { relative: "0 - 3 %", absolute: "0 - 300 /µL", min: 0, max: 3 },
    cat: { relative: "0 - 3 %", absolute: "0 - 300 /µL", min: 0, max: 3 }
  },
  segmentados: {
    dog: { relative: "60 - 77 %", absolute: "3.000 - 11.500 /µL", min: 60, max: 77 },
    cat: { relative: "35 - 75 %", absolute: "2.500 - 12.500 /µL", min: 35, max: 75 }
  },
  eosinofilos: {
    dog: { relative: "2 - 10 %", absolute: "100 - 1.250 /µL", min: 2, max: 10 },
    cat: { relative: "2 - 12 %", absolute: "100 - 1.500 /µL", min: 2, max: 12 }
  },
  basofilos: {
    dog: { relative: "0 - 0 %", absolute: "0 - 0 /µL", min: 0, max: 0 },
    cat: { relative: "0 - 0 %", absolute: "0 - 0 /µL", min: 0, max: 0 }
  },
  linfocitos: {
    dog: { relative: "12 - 30 %", absolute: "1.000 - 4.800 /µL", min: 12, max: 30 },
    cat: { relative: "20 - 55 %", absolute: "1.500 - 7.000 /µL", min: 20, max: 55 }
  },
  monocitos: {
    dog: { relative: "3 - 10 %", absolute: "150 - 1.350 /µL", min: 3, max: 10 },
    cat: { relative: "1 - 4 %", absolute: "50 - 500 /µL", min: 1, max: 4 }
  },
  contagemPlaquetaria: { dog: { full: "166.000 - 575.000 /µL", min: 166000, max: 575000 }, cat: { full: "150.000 - 600.000 /µL", min: 150000, max: 600000 } },
};

/** Exportação com nome original para compatibilidade (usada como base/seed pela tela de Cadastros) */
export const hemogramReferences: Record<string, HemogramReference> = defaultHemogramReferences;

export interface BiochemicalReferenceEntry {
  unit: string;
  dog: { min?: number; max?: number };
  cat: { min?: number; max?: number };
}

interface ExamReferencesBlob {
  hemogram?: Record<string, { dog?: Partial<HemogramReferenceValue>; cat?: Partial<HemogramReferenceValue> }>;
  biochemical?: Record<string, { unit?: string; dog?: { min?: number; max?: number }; cat?: { min?: number; max?: number } }>;
}

// Cacheado em memória pela sessão da aba — evita bater no Supabase toda vez
// que uma tela pede as referências; saveExamReferences() atualiza esse cache
// na hora, então uma edição já reflete sem precisar recarregar a página.
let cachedBlobPromise: Promise<ExamReferencesBlob> | null = null;

async function fetchExamReferencesBlob(): Promise<ExamReferencesBlob> {
  if (cachedBlobPromise) return cachedBlobPromise;
  cachedBlobPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from(SETTINGS_TABLE)
        .select("value")
        .eq("key", SETTINGS_KEY)
        .maybeSingle();
      if (error) throw error;

      if (data?.value) {
        localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(data.value));
        return data.value as ExamReferencesBlob;
      }

      // Nada no banco ainda — migra o que estava salvo no localStorage deste
      // navegador (dado digitado antes desta tela usar o Supabase), pra não
      // perder o que já foi cadastrado.
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        try {
          const legacy = JSON.parse(legacyRaw) as ExamReferencesBlob;
          const { error: upsertError } = await supabase
            .from(SETTINGS_TABLE)
            .upsert({ key: SETTINGS_KEY, value: legacy, updated_at: new Date().toISOString() }, { onConflict: "key" });
          // Antes esse erro era ignorado silenciosamente — foi exatamente
          // assim que o bug do CHECK constraint (key só aceitava
          // 'company'/'user') passou despercebido: a migração "parecia"
          // funcionar (sempre caía no cache local de qualquer jeito), mas
          // nunca persistia de verdade no Supabase.
          if (upsertError) {
            console.error("[examReferences] falha ao migrar localStorage legado pro Supabase", upsertError);
          }
          localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(legacy));
          return legacy;
        } catch {
          // JSON antigo corrompido — ignora e cai no vazio abaixo
        }
      }
      return {};
    } catch (err) {
      console.error("[examReferences] falha ao buscar do Supabase, usando cache local", err);
      const cached = localStorage.getItem(CACHE_STORAGE_KEY);
      if (cached) {
        try {
          return JSON.parse(cached) as ExamReferencesBlob;
        } catch {
          /* ignore */
        }
      }
      return {};
    }
  })();
  return cachedBlobPromise;
}

/**
 * Blob cru (hemogram + biochemical, sem mesclar com defaults) — usado pela
 * própria tela de Cadastros > Referências de Exame, que já tem sua lógica
 * de merge/edição em cima da estrutura salva.
 */
export async function fetchExamReferencesRaw(): Promise<ExamReferencesBlob> {
  return fetchExamReferencesBlob();
}

/**
 * Referências de hemograma: vêm do Supabase (Cadastros > Referências de
 * Exame), mescladas sobre os valores padrão. Assim o laudo e a tela de
 * exame usam o que foi editado, igual em qualquer dispositivo.
 */
export async function fetchHemogramReferences(): Promise<Record<string, HemogramReference>> {
  const blob = await fetchExamReferencesBlob();
  const hemogram = blob.hemogram;
  if (!hemogram || typeof hemogram !== "object") return defaultHemogramReferences;
  const merged: Record<string, HemogramReference> = { ...defaultHemogramReferences };
  for (const key of Object.keys(defaultHemogramReferences)) {
    const incoming = hemogram[key];
    if (incoming?.dog || incoming?.cat) {
      merged[key] = {
        dog: { ...defaultHemogramReferences[key].dog, ...incoming.dog },
        cat: { ...defaultHemogramReferences[key].cat, ...incoming.cat },
      };
    }
  }
  return merged;
}

/**
 * Referências bioquímicas salvas em Cadastros > Referências de Exame. Sem
 * cadastro prévio, retorna vazio — ao contrário do hemograma, não há
 * valores padrão embutidos aqui: faixa bioquímica varia bastante por
 * método/equipamento do laboratório, então cabe ao usuário informar uma
 * vez em Cadastros e o app reaproveita dali em diante (em qualquer aparelho).
 */
export async function fetchBiochemicalReferences(): Promise<Record<string, BiochemicalReferenceEntry>> {
  const blob = await fetchExamReferencesBlob();
  const biochemical = blob.biochemical;
  if (!biochemical || typeof biochemical !== "object") return {};
  const result: Record<string, BiochemicalReferenceEntry> = {};
  for (const [name, entry] of Object.entries(biochemical)) {
    result[name] = {
      unit: entry?.unit || "",
      dog: {
        min: typeof entry?.dog?.min === "number" ? entry.dog.min : undefined,
        max: typeof entry?.dog?.max === "number" ? entry.dog.max : undefined,
      },
      cat: {
        min: typeof entry?.cat?.min === "number" ? entry.cat.min : undefined,
        max: typeof entry?.cat?.max === "number" ? entry.cat.max : undefined,
      },
    };
  }
  return result;
}

/** Analitos bioquímicos padrão — mesma lista usada no cadastro de referências. */
export const DEFAULT_BIOCHEMICAL_NAMES = [
  "Ureia", "Creatinina", "ALT (TGP)", "AST (TGO)", "ALP (Fosfatase Alcalina)", "GGT",
  "CK (CPK)", "Amilase", "Lipase", "Glicose", "Colesterol", "Triglicerídeos",
  "Bilirrubina total", "Bilirrubina direta", "Proteínas totais", "Albumina",
  "Cálcio", "Fósforo", "Frutosamina",
];

/**
 * Nomes dos analitos bioquímicos já cadastrados (Cadastros > Referências de
 * Exame), na mesma ordem em que o usuário os criou. Usado para listar opções
 * de checkbox no Pedido de Exame sem duplicar a lista em outro lugar.
 */
export async function fetchBiochemicalNames(): Promise<string[]> {
  const blob = await fetchExamReferencesBlob();
  const biochemical = blob.biochemical;
  if (!biochemical || typeof biochemical !== "object") return DEFAULT_BIOCHEMICAL_NAMES;
  const names = Object.keys(biochemical);
  return names.length > 0 ? names : DEFAULT_BIOCHEMICAL_NAMES;
}

/** Salva o cadastro completo (hemograma + bioquímico) no Supabase. */
export async function saveExamReferences(blob: ExamReferencesBlob): Promise<boolean> {
  const { error } = await supabase
    .from(SETTINGS_TABLE)
    .upsert({ key: SETTINGS_KEY, value: blob, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) {
    console.error("[saveExamReferences] error", error);
    return false;
  }
  localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(blob));
  cachedBlobPromise = Promise.resolve(blob);
  return true;
}

/**
 * Chamado ao lançar um exame bioquímico: se o analito (pra essa espécie)
 * ainda não tinha referência cadastrada, o mín/máx/unidade que o usuário
 * acabou de digitar na hora vira o cadastro central automaticamente — não
 * precisa ir em Cadastros > Referências de Exame separadamente. Só grava se
 * realmente estava faltando; nunca sobrescreve um valor já cadastrado (isso
 * continua sendo feito só pela tela de Cadastros, de propósito).
 */
export async function saveBiochemicalReferenceIfMissing(
  enzymeName: string,
  species: "dog" | "cat",
  values: { min: number; max: number; unit: string }
): Promise<{ saved: boolean; blob?: ExamReferencesBlob }> {
  const blob = await fetchExamReferencesRaw();
  const existing = blob.biochemical?.[enzymeName]?.[species];
  if (existing && typeof existing.min === "number" && typeof existing.max === "number") {
    return { saved: false };
  }

  const current = blob.biochemical?.[enzymeName] || {};
  const nextBiochemical = {
    ...(blob.biochemical || {}),
    [enzymeName]: {
      unit: current.unit || values.unit,
      dog: species === "dog" ? { ...current.dog, min: values.min, max: values.max } : current.dog,
      cat: species === "cat" ? { ...current.cat, min: values.min, max: values.max } : current.cat,
    },
  };
  const nextBlob: ExamReferencesBlob = { ...blob, biochemical: nextBiochemical };
  const ok = await saveExamReferences(nextBlob);
  return { saved: ok, blob: ok ? nextBlob : undefined };
}
