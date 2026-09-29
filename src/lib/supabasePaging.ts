// O Supabase (PostgREST) devolve no máximo 1000 linhas por consulta. Sem
// paginar, uma lista maior que isso é cortada EM SILÊNCIO — os lançamentos
// mais antigos sumiam dos relatórios e do fechamento sem nenhum erro.

type PageResult<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

export const SUPABASE_MAX_ROWS = 1000;

/**
 * Busca todas as páginas de uma consulta. `build(from, to)` monta a consulta
 * com `.range(from, to)` e uma ordenação estável (termine em `id`, senão a
 * mesma linha pode aparecer em duas páginas).
 */
export async function fetchAllPages<T>(
  build: (from: number, to: number) => PageResult<T>,
  pageSize = SUPABASE_MAX_ROWS
): Promise<{ data: T[]; error: unknown }> {
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) return { data: all, error };
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < pageSize) return { data: all, error: null };
  }
}

/**
 * Divide uma lista de ids em lotes para filtros `.in(...)`: cada id vai na
 * URL, e centenas deles de uma vez passam do limite de tamanho da requisição.
 */
export function chunk<T>(list: T[], size = 150): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
