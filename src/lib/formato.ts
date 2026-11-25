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
