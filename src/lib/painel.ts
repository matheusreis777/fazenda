// Contas da tela Início (painel). Funções puras sobre os dados já carregados.
// Sem imports do app de propósito: painel.check.mjs roda este arquivo direto no Node.

type ComEntradaSaida = { entrada_data: string; saida_data: string | null };

/** Os últimos `n` meses como 'AAAA-MM', do mais antigo ao atual. */
export function ultimosMeses(n: number, hoje: string): string[] {
  const ano = Number(hoje.slice(0, 4));
  const mes = Number(hoje.slice(5, 7)) - 1;
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(ano, mes - (n - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}

/** Último dia do mês 'AAAA-MM' como 'AAAA-MM-DD'. */
export function fimDoMes(mes: string): string {
  const d = new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0));
  return d.toISOString().slice(0, 10);
}

/** Animais no rebanho numa data: já tinham entrado e ainda não tinham saído. */
export function cabecasEm(animais: ComEntradaSaida[], data: string): number {
  return animais.filter((a) => a.entrada_data <= data && (!a.saida_data || a.saida_data > data)).length;
}

/** Soma por mês: para cada mês, soma `valor(item)` dos itens cuja `data(item)` cai nele. */
export function somaPorMes<T>(itens: T[], meses: string[], data: (item: T) => string | null, valor: (item: T) => number): number[] {
  const porMes = new Map(meses.map((m) => [m, 0]));
  for (const item of itens) {
    const m = data(item)?.slice(0, 7);
    if (m && porMes.has(m)) porMes.set(m, porMes.get(m)! + valor(item));
  }
  return meses.map((m) => porMes.get(m)!);
}

/** Variação percentual de `antes` para `agora`; null se `antes` for zero. */
export function variacao(agora: number, antes: number): number | null {
  return antes === 0 ? null : (agora - antes) / Math.abs(antes);
}

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
/** '2026-01' → 'jan'; janeiro leva o ano ('jan 26') para marcar a virada. */
export function mesCurto(mes: string): string {
  const nome = MESES_CURTOS[Number(mes.slice(5, 7)) - 1];
  return mes.endsWith('-01') ? `${nome} ${mes.slice(2, 4)}` : nome;
}

/** Valores "redondos" para o eixo: 0 até um teto que cobre `maximo`, em até `quantos` passos. */
export function marcasDoEixo(maximo: number, quantos = 4): number[] {
  if (maximo <= 0) return [0, 1];
  const bruto = maximo / quantos;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((f) => f * potencia).find((p) => p >= bruto)!;
  const teto = Math.ceil(maximo / passo) * passo;
  return Array.from({ length: Math.round(teto / passo) + 1 }, (_, i) => i * passo);
}
