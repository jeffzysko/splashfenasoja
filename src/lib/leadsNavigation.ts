// Persiste a lista de IDs de leads visíveis (com filtros/sort/busca aplicados)
// para que a página de detalhe consiga navegar Próximo/Anterior consistente
// com o que o usuário viu na listagem — sem precisar refazer a query.

const KEY = "leadsNav:v1:ids";

export function setVisibleLeadIds(ids: string[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // quota — ignora
  }
}

export function getVisibleLeadIds(): string[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function getAdjacentLeadIds(
  currentId: string
): { prev: string | null; next: string | null; index: number; total: number } {
  const ids = getVisibleLeadIds();
  const idx = ids.indexOf(currentId);
  if (idx < 0) return { prev: null, next: null, index: -1, total: ids.length };
  return {
    prev: idx > 0 ? ids[idx - 1] : null,
    next: idx < ids.length - 1 ? ids[idx + 1] : null,
    index: idx,
    total: ids.length,
  };
}
