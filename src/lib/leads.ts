// Domain constants & helpers for leads
// Os valores aqui DEVEM bater com os strings salvos no Supabase.

export const TAMANHO_OPTIONS = [
  { value: "<3m", label: "Até 3 metros", emoji: "📏" },
  { value: "3-5m", label: "Entre 3 e 5 metros", emoji: "📐" },
  { value: "5-7m", label: "Entre 5 e 7 metros", emoji: "🏡" },
  { value: ">7m", label: "Acima de 7 metros", emoji: "🏰" },
  { value: "Não sei medir", label: "Não sei medir agora", emoji: "🤔" },
] as const;

export const PRAZO_OPTIONS = [
  { value: "30dias", label: "Próximos 30 dias", hint: "Tô pra fechar logo", emoji: "🔥" },
  { value: "3meses", label: "Próximos 3 meses", emoji: "☀️" },
  { value: "6meses+", label: "Daqui 6 meses ou mais", emoji: "📅" },
  { value: "Pesquisando", label: "Só pesquisando", emoji: "🔎" },
] as const;

export const ORCAMENTO_OPTIONS = [
  { value: "<25k", label: "Até R$ 25 mil", emoji: "💧" },
  { value: "25-50k", label: "R$ 25 a 50 mil", emoji: "💎" },
  { value: "50-100k", label: "R$ 50 a 100 mil", emoji: "🌊" },
  { value: ">100k", label: "Acima de R$ 100 mil", emoji: "🏝️" },
  { value: "Conversar", label: "Prefiro conversar com vendedor", emoji: "💬" },
] as const;

export const LABELS = {
  tamanho_quintal: Object.fromEntries(TAMANHO_OPTIONS.map((o) => [o.value as string, o.label])),
  prazo_compra: Object.fromEntries(PRAZO_OPTIONS.map((o) => [o.value as string, o.label])),
  orcamento: Object.fromEntries(ORCAMENTO_OPTIONS.map((o) => [o.value as string, o.label])),
} as const;

const PRAZO_SCORE: Record<string, number> = {
  "30dias": 40,
  "3meses": 25,
  "6meses+": 10,
  Pesquisando: 0,
};

const ORCAMENTO_SCORE: Record<string, number> = {
  ">100k": 30,
  "50-100k": 25,
  "25-50k": 15,
  "<25k": 10,
  Conversar: 5,
};

export type Temperatura = "quente" | "morno" | "frio";

export function calcScore(input: {
  prazo_compra: string;
  orcamento: string;
  email?: string | null;
  tamanho_quintal: string;
}): { score: number; temperatura: Temperatura } {
  let score = 0;
  score += PRAZO_SCORE[input.prazo_compra] ?? 0;
  score += ORCAMENTO_SCORE[input.orcamento] ?? 0;
  if (input.email && input.email.trim()) score += 15;
  if (input.tamanho_quintal && input.tamanho_quintal !== "Não sei medir") score += 15;
  score = Math.min(100, score);
  const temperatura: Temperatura =
    score >= 70 ? "quente" : score >= 40 ? "morno" : "frio";
  return { score, temperatura };
}

/** Normaliza WhatsApp BR: só dígitos com 55 na frente. Ex: (55) 99999-8888 -> 5555999998888 */
export function normalizeWhatsapp(masked: string): string {
  const digits = masked.replace(/\D/g, "");
  if (digits.startsWith("55")) return digits;
  return "55" + digits;
}

export const TEMP_BADGE: Record<Temperatura, { label: string; className: string }> = {
  quente: { label: "🔥 Quente", className: "bg-primary/15 text-primary border-primary/30" },
  morno: { label: "☀️ Morno", className: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  frio: { label: "❄️ Frio", className: "bg-sky-500/15 text-sky-700 border-sky-500/30" },
};

// WhatsApp da Splash (placeholder configurável). Troque pelo número real.
export const SPLASH_WHATSAPP = "5555999999999";
