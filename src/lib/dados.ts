// Estado que as telas leem. Os nomes dos campos são os do schema em supabase/migrations/0001_inicial.sql.
// Sem Supabase configurado, vale o modo exemplo: dados abaixo, alterados só em memória.
// Com Supabase, src/lib/banco.ts se registra aqui (`conectar`) e `salvar`/`excluir` passam a gravar no banco.
// Este arquivo não importa nada do app de propósito: dados.check.mjs roda ele direto no Node.
import { useSyncExternalStore } from 'react';

export const CATEGORIAS = {
  alimentacao: 'Alimentação',
  maquinario: 'Maquinário',
  funcionarios: 'Funcionários',
  mantimentos: 'Mantimentos',
  fixo: 'Gastos fixos',
  outros: 'Outros',
} as const;
export type Categoria = keyof typeof CATEGORIAS;

export type Lote = { id: number; nome: string; descricao?: string | null };
export type Animal = {
  id: number;
  brinco: string;
  sexo: 'M' | 'F';
  raca: string;
  lote_id: number;
  entrada_data: string;
  entrada_tipo: 'compra' | 'nascimento';
  entrada_peso: number;
  entrada_valor?: number | null;
  saida_data: string | null;
  saida_tipo: 'venda' | 'morte' | 'abate' | null;
  saida_peso?: number | null;
  saida_valor: number | null;
};
/** `saldo_inicial` é o que já havia ao cadastrar; `minimo` serve para destacar estoque baixo. */
type InsumoBase = { id: number; nome: string; unidade: string; minimo: number; saldo_inicial: number };
export type Insumo = InsumoBase & { saldo: number };
type TratoBase = { id: number; data: string; lote_id: number; insumo_id: number; quantidade: number };
export type Trato = TratoBase & { insumo: string; unidade: string };
export type Despesa = {
  id: number;
  data: string;
  categoria: Categoria;
  descricao: string;
  valor: number;
  /** Só leitura: veio de um gasto recorrente (no banco, recorrente_id preenchido). */
  recorrente?: boolean;
  /** Preenchidos juntos quando a despesa é compra de insumo (entra no estoque). */
  insumo_id?: number | null;
  quantidade?: number | null;
};
export type Recorrente = { id: number; descricao: string; categoria: Categoria; valor: number; dia_vencimento: number; ativo: boolean };

export type Base = { lotes: Lote[]; animais: Animal[]; insumos: InsumoBase[]; tratos: TratoBase[]; despesas: Despesa[]; recorrentes: Recorrente[] };

const semSaida = { saida_data: null, saida_tipo: null, saida_valor: null } as const;

const EXEMPLO: Base = {
  lotes: [
    { id: 1, nome: 'Pasto da Sede' },
    { id: 2, nome: 'Pasto do Açude' },
    { id: 3, nome: 'Confinamento', descricao: 'Engorda no cocho' },
  ],
  animais: [
    { id: 1, brinco: '0101', sexo: 'M', raca: 'Nelore', lote_id: 1, entrada_data: '2026-03-12', entrada_tipo: 'compra', entrada_peso: 210, ...semSaida },
    { id: 2, brinco: '0102', sexo: 'M', raca: 'Nelore', lote_id: 1, entrada_data: '2026-03-12', entrada_tipo: 'compra', entrada_peso: 225, ...semSaida },
    { id: 3, brinco: '0103', sexo: 'F', raca: 'Nelore', lote_id: 2, entrada_data: '2026-04-02', entrada_tipo: 'compra', entrada_peso: 198, ...semSaida },
    { id: 4, brinco: '0104', sexo: 'F', raca: 'Angus', lote_id: 2, entrada_data: '2026-05-20', entrada_tipo: 'nascimento', entrada_peso: 34, ...semSaida },
    { id: 5, brinco: '0105', sexo: 'M', raca: 'Angus', lote_id: 3, entrada_data: '2026-01-15', entrada_tipo: 'compra', entrada_peso: 380, ...semSaida },
    { id: 6, brinco: '0106', sexo: 'M', raca: 'Nelore', lote_id: 3, entrada_data: '2026-01-15', entrada_tipo: 'compra', entrada_peso: 395, ...semSaida },
    { id: 7, brinco: '0098', sexo: 'M', raca: 'Nelore', lote_id: 3, entrada_data: '2025-11-03', entrada_tipo: 'compra', entrada_peso: 360, saida_data: '2026-11-10', saida_tipo: 'venda', saida_valor: 5850 },
    { id: 8, brinco: '0097', sexo: 'M', raca: 'Nelore', lote_id: 3, entrada_data: '2025-11-03', entrada_tipo: 'compra', entrada_peso: 352, saida_data: '2026-11-10', saida_tipo: 'venda', saida_valor: 5720 },
    { id: 9, brinco: '0090', sexo: 'F', raca: 'Nelore', lote_id: 2, entrada_data: '2025-08-21', entrada_tipo: 'compra', entrada_peso: 240, saida_data: '2026-10-02', saida_tipo: 'morte', saida_valor: null },
  ],
  insumos: [
    { id: 1, nome: 'Ração de engorda', unidade: 'kg', minimo: 1000, saldo_inicial: 130 },
    { id: 2, nome: 'Sal mineral', unidade: 'kg', minimo: 200, saldo_inicial: 147 },
    { id: 3, nome: 'Silagem de milho', unidade: 'kg', minimo: 3000, saldo_inicial: 9720 },
    { id: 4, nome: 'Vermífugo', unidade: 'doses', minimo: 30, saldo_inicial: 18 },
  ],
  tratos: [
    { id: 1, data: '2026-11-23', lote_id: 3, insumo_id: 1, quantidade: 140 },
    { id: 2, data: '2026-11-23', lote_id: 3, insumo_id: 3, quantidade: 320 },
    { id: 3, data: '2026-11-22', lote_id: 1, insumo_id: 2, quantidade: 15 },
    { id: 4, data: '2026-11-22', lote_id: 3, insumo_id: 1, quantidade: 140 },
    { id: 5, data: '2026-11-21', lote_id: 2, insumo_id: 2, quantidade: 12 },
  ],
  despesas: [
    { id: 1, data: '2026-11-20', categoria: 'alimentacao', descricao: 'Ração de engorda — 2.000 kg', valor: 4600, insumo_id: 1, quantidade: 2000 },
    { id: 2, data: '2026-11-18', categoria: 'maquinario', descricao: 'Troca de óleo do trator', valor: 780 },
    { id: 3, data: '2026-11-15', categoria: 'maquinario', descricao: 'Diesel — 400 L', valor: 2440 },
    { id: 4, data: '2026-11-12', categoria: 'mantimentos', descricao: 'Compras da sede', valor: 930 },
    { id: 5, data: '2026-11-10', categoria: 'fixo', descricao: 'Energia elétrica', valor: 640, recorrente: true },
    { id: 6, data: '2026-11-05', categoria: 'funcionarios', descricao: 'Salário — José', valor: 2400, recorrente: true },
    { id: 7, data: '2026-11-05', categoria: 'funcionarios', descricao: 'Salário — Antônio', valor: 2100, recorrente: true },
    { id: 8, data: '2026-11-03', categoria: 'outros', descricao: 'Arame e grampos para cerca', valor: 510 },
  ],
  recorrentes: [
    { id: 1, descricao: 'Salário — José', categoria: 'funcionarios', valor: 2400, dia_vencimento: 5, ativo: true },
    { id: 2, descricao: 'Salário — Antônio', categoria: 'funcionarios', valor: 2100, dia_vencimento: 5, ativo: true },
    { id: 3, descricao: 'Energia elétrica', categoria: 'fixo', valor: 640, dia_vencimento: 10, ativo: true },
    { id: 4, descricao: 'Internet rural', categoria: 'fixo', valor: 180, dia_vencimento: 15, ativo: true },
    { id: 5, descricao: 'Arrendamento do pasto vizinho', categoria: 'fixo', valor: 1500, dia_vencimento: 20, ativo: false },
  ],
};

const maisRecentePrimeiro = (a: { data: string; id: number }, b: { data: string; id: number }) =>
  b.data.localeCompare(a.data) || b.id - a.id;

export const BASE_VAZIA: Base = { lotes: [], animais: [], insumos: [], tratos: [], despesas: [], recorrentes: [] };

let base: Base = EXEMPLO;
/**
 * `carregado` fica falso enquanto a primeira leitura do banco não termina; `erro` é a falha dessa leitura;
 * `pendente` = a conta entrou mas ainda não foi aprovada (o banco não entrega nenhum dado a ela);
 * `admin` = a conta é de desenvolvedor (vê a aba de administração de contas).
 */
type Situacao = { carregado: boolean; erro: string | null; pendente?: boolean; admin?: boolean };
let situacao: Situacao = { carregado: true, erro: null };

/**
 * O que as telas leem. Saldo = saldo inicial + compras (despesas com insumo) − consumo (tratos),
 * a mesma conta da view estoque_insumos.
 */
function derivar(b: Base) {
  const estoque: Insumo[] = b.insumos.map((i) => ({
    ...i,
    saldo:
      i.saldo_inicial +
      b.despesas.reduce((s, d) => s + (d.insumo_id === i.id ? (d.quantidade ?? 0) : 0), 0) -
      b.tratos.reduce((s, t) => s + (t.insumo_id === i.id ? t.quantidade : 0), 0),
  }));
  const tratos: Trato[] = b.tratos
    .map((t) => {
      const insumo = b.insumos.find((i) => i.id === t.insumo_id);
      return { ...t, insumo: insumo?.nome ?? '—', unidade: insumo?.unidade ?? '' };
    })
    .sort(maisRecentePrimeiro);
  return { ...situacao, lotes: b.lotes, animais: b.animais, estoque, tratos, despesas: [...b.despesas].sort(maisRecentePrimeiro), recorrentes: b.recorrentes };
}

let dados = derivar(base);
const ouvintes = new Set<() => void>();
const assinar = (avisar: () => void) => {
  ouvintes.add(avisar);
  return () => ouvintes.delete(avisar);
};
/** Troca o estado inteiro (o banco chama isto depois de cada leitura). */
export function definir(nova: Base, novaSituacao = situacao) {
  base = nova;
  situacao = novaSituacao;
  dados = derivar(base);
  ouvintes.forEach((avisar) => avisar());
}

type Alteracao<K extends keyof Base> = Omit<Item<K>, 'id'> | (Partial<Item<K>> & { id: number });
/** Quem grava de verdade. Cada operação devolve null se deu certo ou a mensagem de erro para mostrar. */
export type Remoto = {
  salvar: (colecao: keyof Base, item: { id?: number } & Record<string, unknown>) => Promise<string | null>;
  excluir: (colecao: keyof Base, id: number) => Promise<string | null>;
};
let remoto: Remoto | null = null;
export const modoExemplo = () => remoto === null;

/** Liga o app ao banco: começa vazio e "carregando" até a primeira leitura chegar por `definir`. */
export function conectar(r: Remoto) {
  remoto = r;
  definir(BASE_VAZIA, { carregado: false, erro: null });
}
let proximoId = 1000;
type Item<K extends keyof Base> = Base[K][number];

export const lerDados = () => dados;
export function useDados() {
  return useSyncExternalStore(assinar, lerDados, lerDados);
}

/**
 * Sem `id` cria um registro novo; com `id` altera só os campos informados.
 * Devolve null se deu certo ou a mensagem de erro (ex.: o banco recusou).
 */
export async function salvar<K extends keyof Base>(colecao: K, item: Alteracao<K>): Promise<string | null> {
  if (remoto) return remoto.salvar(colecao, item as { id?: number } & Record<string, unknown>);
  const lista = base[colecao] as { id: number }[];
  const nova =
    'id' in item && item.id != null
      ? lista.map((x) => (x.id === item.id ? { ...x, ...item } : x))
      : [{ ...item, id: proximoId++ }, ...lista];
  definir({ ...base, [colecao]: nova });
  return null;
}

export async function excluir(colecao: keyof Base, id: number): Promise<string | null> {
  if (remoto) return remoto.excluir(colecao, id);
  definir({ ...base, [colecao]: (base[colecao] as { id: number }[]).filter((x) => x.id !== id) });
  return null;
}

/** Insumo com tratos ou compras lançados não pode ser excluído (no banco, a chave estrangeira impede). */
export const insumoEmUso = (id: number) =>
  base.tratos.some((t) => t.insumo_id === id) || base.despesas.some((d) => d.insumo_id === id);

/** Lote com animais (inclusive os que já saíram) ou tratos não pode ser excluído, pela mesma razão. */
export const loteEmUso = (id: number) => base.animais.some((a) => a.lote_id === id) || base.tratos.some((t) => t.lote_id === id);

/** Recebe a lista (de useDados) em vez de ler o estado direto, para a tela atualizar quando um lote muda de nome. */
export const nomeLote = (lotes: Lote[], id: number) => lotes.find((l) => l.id === id)?.nome ?? '—';
export const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const numero = (v: number) => v.toLocaleString('pt-BR');
/** '2026-11-23' → '23/11' */
export const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Mês como 'AAAA-MM' (o começo das datas ISO), para filtrar lançamentos. `deslocar` anda N meses. */
export function mesIso(deslocar = 0, de = new Date()): string {
  const d = new Date(de.getFullYear(), de.getMonth() + deslocar, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
/** '2026-11' → 'Novembro de 2026' */
export function nomeMes(mes: string): string {
  const nome = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}
