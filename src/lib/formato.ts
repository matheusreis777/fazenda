// Conversões entre o que a pessoa digita (pt-BR) e os valores guardados.
// Sem imports de propósito: formato.check.mjs roda este arquivo direto no Node.

/** '1.500,5' | '1500,5' | '1.500' | '1500.5' → número; NaN se não for número. */
export function num(texto: string): number {
  const t = texto.trim();
  if (!t) return NaN;
  if (t.includes(',')) return Number(t.replace(/\./g, '').replace(',', '.'));
  // Só pontos: '1.500' é milhar em pt-BR; '1500.5' é decimal.
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, ''));
  return Number(t);
}

/** Número → texto de campo, com vírgula decimal (1500.5 → '1500,5'). */
export function numParaTexto(n: number): string {
  return String(n).replace('.', ',');
}

/** Hoje como 'AAAA-MM-DD', no fuso do aparelho (o formato do <input type="date"> e do banco). */
export function hojeIso(de = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${de.getFullYear()}-${p(de.getMonth() + 1)}-${p(de.getDate())}`;
}

/**
 * Quilos de peso vivo em 1 arroba (@). Costume na pesagem do boi vivo: 30 kg na balança = 1 @
 * (equivale a 15 kg de carcaça com 50% de rendimento). Se a fazenda usar outro valor, é só mudar aqui.
 */
export const KG_POR_ARROBA = 30;

export const kgParaArroba = (kg: number) => kg / KG_POR_ARROBA;
export const arrobaParaKg = (arrobas: number) => arrobas * KG_POR_ARROBA;

/** 540 → '540 kg · 18 @'; 352,5 → '352,5 kg · 11,8 @' */
export function textoPeso(kg: number): string {
  const f = (v: number, casas: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: casas });
  return `${f(kg, 1)} kg · ${f(kgParaArroba(kg), 1)} @`;
}
