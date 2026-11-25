// Estado que as telas leem. Os nomes dos campos são os do schema em supabase/migrations/.
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
  /** Gasto ligado a um funcionário ou a uma máquina (salário, manutenção, diesel…). */
  funcionario_id?: number | null;
  maquina_id?: number | null;
};
export type Recorrente = {
  id: number;
  descricao: string;
  categoria: Categoria;
  valor: number;
  dia_vencimento: number;
  ativo: boolean;
  funcionario_id?: number | null;
  maquina_id?: number | null;
};
export type Pesagem = { id: number; animal_id: number; data: string; peso: number };

export const TIPOS_SANIDADE = {
  vacina: 'Vacina',
  vermifugo: 'Vermífugo',
  tratamento: 'Tratamento',
  exame: 'Exame',
  outro: 'Outro',
} as const;
export type TipoSanidade = keyof typeof TIPOS_SANIDADE;
/** Aplicado num animal OU num lote inteiro (exatamente um dos dois). */
export type Sanidade = {
  id: number;
  data: string;
  tipo: TipoSanidade;
  produto: string;
  animal_id: number | null;
  lote_id: number | null;
  /** Quando repetir (próxima dose, reforço). */
  proxima_data: string | null;
  observacao: string | null;
};
export type Funcionario = {
  id: number;
  nome: string;
  funcao: string | null;
  telefone: string | null;
  salario: number | null;
  admissao: string | null;
  ativo: boolean;
};
export type Maquina = { id: number; nome: string; tipo: string | null; identificacao: string | null; ano: number | null; ativo: boolean };
/** Dados da própria fazenda: no banco é uma linha só, sempre com id 1 (ver supabase/migrations/0005_fazenda.sql). */
export type Fazenda = { id: 1; nome: string };

export type Base = {
  lotes: Lote[];
  animais: Animal[];
  insumos: InsumoBase[];
  tratos: TratoBase[];
  despesas: Despesa[];
  recorrentes: Recorrente[];
  pesagens: Pesagem[];
  sanidade: Sanidade[];
  funcionarios: Funcionario[];
  maquinas: Maquina[];
  fazenda: Fazenda[];
};

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
    { id: 2, data: '2026-11-18', categoria: 'maquinario', descricao: 'Troca de óleo do trator', valor: 780, maquina_id: 1 },
    { id: 3, data: '2026-11-15', categoria: 'maquinario', descricao: 'Diesel — 400 L', valor: 2440, maquina_id: 1 },
    { id: 4, data: '2026-11-12', categoria: 'mantimentos', descricao: 'Compras da sede', valor: 930 },
    { id: 5, data: '2026-11-10', categoria: 'fixo', descricao: 'Energia elétrica', valor: 640, recorrente: true },
    { id: 6, data: '2026-11-05', categoria: 'funcionarios', descricao: 'Salário — José', valor: 2400, recorrente: true, funcionario_id: 1 },
    { id: 7, data: '2026-11-05', categoria: 'funcionarios', descricao: 'Salário — Antônio', valor: 2100, recorrente: true, funcionario_id: 2 },
    { id: 9, data: '2026-10-28', categoria: 'maquinario', descricao: 'Pneu da carreta', valor: 1350, maquina_id: 2 },
    { id: 10, data: '2026-10-20', categoria: 'mantimentos', descricao: 'Ferramentas e EPI', valor: 640 },
    { id: 11, data: '2026-10-05', categoria: 'funcionarios', descricao: 'Salário — José', valor: 2400, recorrente: true, funcionario_id: 1 },
    { id: 12, data: '2026-10-05', categoria: 'funcionarios', descricao: 'Salário — Antônio', valor: 2100, recorrente: true, funcionario_id: 2 },
    { id: 8, data: '2026-11-03', categoria: 'outros', descricao: 'Arame e grampos para cerca', valor: 510 },
  ],
  recorrentes: [
    { id: 1, descricao: 'Salário — José', categoria: 'funcionarios', valor: 2400, dia_vencimento: 5, ativo: true, funcionario_id: 1 },
    { id: 2, descricao: 'Salário — Antônio', categoria: 'funcionarios', valor: 2100, dia_vencimento: 5, ativo: true, funcionario_id: 2 },
    { id: 3, descricao: 'Energia elétrica', categoria: 'fixo', valor: 640, dia_vencimento: 10, ativo: true },
    { id: 4, descricao: 'Internet rural', categoria: 'fixo', valor: 180, dia_vencimento: 15, ativo: true },
    { id: 5, descricao: 'Arrendamento do pasto vizinho', categoria: 'fixo', valor: 1500, dia_vencimento: 20, ativo: false },
  ],
  pesagens: [
    { id: 1, animal_id: 1, data: '2026-07-10', peso: 285 },
    { id: 2, animal_id: 1, data: '2026-10-15', peso: 352 },
    { id: 3, animal_id: 2, data: '2026-07-10', peso: 296 },
    { id: 4, animal_id: 2, data: '2026-10-15', peso: 371 },
    { id: 5, animal_id: 3, data: '2026-10-15', peso: 318 },
    { id: 6, animal_id: 5, data: '2026-08-01', peso: 470 },
    { id: 7, animal_id: 5, data: '2026-11-01', peso: 548 },
    { id: 8, animal_id: 6, data: '2026-11-01', peso: 562 },
  ],
  sanidade: [
    { id: 1, data: '2026-05-10', tipo: 'vacina', produto: 'Febre aftosa', animal_id: null, lote_id: 1, proxima_data: '2026-11-10', observacao: null },
    { id: 2, data: '2026-05-10', tipo: 'vacina', produto: 'Febre aftosa', animal_id: null, lote_id: 2, proxima_data: '2026-11-10', observacao: null },
    { id: 3, data: '2026-11-12', tipo: 'vacina', produto: 'Febre aftosa', animal_id: null, lote_id: 1, proxima_data: '2027-05-12', observacao: null },
    { id: 4, data: '2026-09-01', tipo: 'vermifugo', produto: 'Ivermectina 1%', animal_id: null, lote_id: 3, proxima_data: '2026-12-01', observacao: '1 ml para cada 50 kg' },
    { id: 5, data: '2026-11-18', tipo: 'tratamento', produto: 'Antibiótico (pneumonia)', animal_id: 4, lote_id: null, proxima_data: '2026-11-21', observacao: '3 doses, a cada 72 h' },
  ],
  funcionarios: [
    { id: 1, nome: 'José da Silva', funcao: 'Vaqueiro', telefone: '(64) 99999-0001', salario: 2400, admissao: '2023-02-01', ativo: true },
    { id: 2, nome: 'Antônio Souza', funcao: 'Tratorista', telefone: '(64) 99999-0002', salario: 2100, admissao: '2024-08-15', ativo: true },
  ],
  maquinas: [
    { id: 1, nome: 'Trator', tipo: 'Trator', identificacao: 'Massey Ferguson 4275', ano: 2015, ativo: true },
    { id: 2, nome: 'Carreta', tipo: 'Implemento', identificacao: null, ano: 2018, ativo: true },
  ],
  fazenda: [{ id: 1, nome: 'Fazenda Boa Esperança' }],
};

const maisRecentePrimeiro = (a: { data: string; id: number }, b: { data: string; id: number }) =>
  b.data.localeCompare(a.data) || b.id - a.id;

export const BASE_VAZIA: Base = {
  lotes: [],
  animais: [],
  insumos: [],
  tratos: [],
  despesas: [],
  recorrentes: [],
  pesagens: [],
  sanidade: [],
  funcionarios: [],
  maquinas: [],
  fazenda: [],
};

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
  return {
    ...situacao,
    lotes: b.lotes,
    animais: b.animais,
    estoque,
    tratos,
    despesas: [...b.despesas].sort(maisRecentePrimeiro),
    recorrentes: b.recorrentes,
    pesagens: [...b.pesagens].sort(maisRecentePrimeiro),
    sanidade: [...b.sanidade].sort(maisRecentePrimeiro),
    funcionarios: [...b.funcionarios].sort((x, y) => Number(y.ativo) - Number(x.ativo) || x.nome.localeCompare(y.nome, 'pt-BR')),
    maquinas: [...b.maquinas].sort((x, y) => Number(y.ativo) - Number(x.ativo) || x.nome.localeCompare(y.nome, 'pt-BR')),
    /** '' enquanto ninguém deu nome; as telas mostram "Fazenda" no lugar. */
    nomeFazenda: b.fazenda[0]?.nome.trim() ?? '',
  };
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
  const nova = { ...base, [colecao]: (base[colecao] as { id: number }[]).filter((x) => x.id !== id) };
  // Igual ao banco (on delete cascade): excluir o animal leva junto as pesagens e a sanidade dele.
  if (colecao === 'animais') {
    nova.pesagens = base.pesagens.filter((p) => p.animal_id !== id);
    nova.sanidade = base.sanidade.filter((s) => s.animal_id !== id);
  }
  definir(nova);
  return null;
}

/** Insumo com tratos ou compras lançados não pode ser excluído (no banco, a chave estrangeira impede). */
export const insumoEmUso = (id: number) =>
  base.tratos.some((t) => t.insumo_id === id) || base.despesas.some((d) => d.insumo_id === id);

/** Lote com animais (inclusive os que já saíram) ou tratos não pode ser excluído, pela mesma razão. */
export const loteEmUso = (id: number) =>
  base.animais.some((a) => a.lote_id === id) || base.tratos.some((t) => t.lote_id === id) || base.sanidade.some((s) => s.lote_id === id);

/** Funcionário ou máquina com despesas lançadas não pode ser excluído: o caminho é marcar como inativo. */
export const funcionarioEmUso = (id: number) =>
  base.despesas.some((d) => d.funcionario_id === id) || base.recorrentes.some((r) => r.funcionario_id === id);
export const maquinaEmUso = (id: number) => base.despesas.some((d) => d.maquina_id === id) || base.recorrentes.some((r) => r.maquina_id === id);

/** Dias entre duas datas ISO ('AAAA-MM-DD'), contando de `de` até `ate`. */
export function dias(de: string, ate: string): number {
  return Math.round((Date.UTC(+ate.slice(0, 4), +ate.slice(5, 7) - 1, +ate.slice(8, 10)) - Date.UTC(+de.slice(0, 4), +de.slice(5, 7) - 1, +de.slice(8, 10))) / 86_400_000);
}

/** Data ISO + N dias. */
export function somarDias(iso: string, n: number): string {
  const d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + n));
  return d.toISOString().slice(0, 10);
}

/**
 * Peso atual e ganho médio diário (GMD) de um animal, considerando a entrada como a primeira pesagem.
 * `gmd` é null enquanto não houver pesagem depois da entrada.
 */
export function evolucaoPeso(animal: Animal, pesagens: Pesagem[]): { peso: number; data: string; gmd: number | null } {
  const doAnimal = pesagens.filter((p) => p.animal_id === animal.id && p.data >= animal.entrada_data);
  const ultima = doAnimal.reduce<Pesagem | null>((u, p) => (!u || p.data > u.data || (p.data === u.data && p.id > u.id) ? p : u), null);
  if (!ultima) return { peso: animal.entrada_peso, data: animal.entrada_data, gmd: null };
  const periodo = dias(animal.entrada_data, ultima.data);
  return { peso: ultima.peso, data: ultima.data, gmd: periodo > 0 ? (ultima.peso - animal.entrada_peso) / periodo : null };
}

/**
 * Manejos sanitários a repetir: para cada alvo (animal ou lote) e produto, vale só a aplicação mais recente;
 * entra na lista se ela tem próxima data até `ate` (inclusive as atrasadas).
 */
export function proximosManejos(registros: Sanidade[], ate: string): Sanidade[] {
  const maisRecente = new Map<string, Sanidade>();
  for (const s of registros) {
    const chave = `${s.animal_id ?? ''}|${s.lote_id ?? ''}|${s.produto.trim().toLowerCase()}`;
    const atual = maisRecente.get(chave);
    if (!atual || s.data > atual.data || (s.data === atual.data && s.id > atual.id)) maisRecente.set(chave, s);
  }
  return [...maisRecente.values()]
    .filter((s) => s.proxima_data && s.proxima_data <= ate)
    .sort((a, b) => a.proxima_data!.localeCompare(b.proxima_data!));
}

/** Recebe a lista (de useDados) em vez de ler o estado direto, para a tela atualizar quando um lote muda de nome. */
export const nomeLote = (lotes: Lote[], id: number) => lotes.find((l) => l.id === id)?.nome ?? '—';
export const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const numero = (v: number) => v.toLocaleString('pt-BR');
/** 12345 → '12,3 mil'; 1200000 → '1,2 mi'. Para números grandes caberem nos cartões. */
export const numeroCurto = (v: number) => v.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
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

/**
 * Cria um lote só com o nome, de dentro de outro formulário (ex.: cadastro de animal).
 * Devolve o id do lote novo como texto (o valor da opção) ou a mensagem de erro.
 */
export async function criarLote(nome: string): Promise<{ valor: string } | { erro: string }> {
  const limpo = nome.trim();
  if (!limpo) return { erro: 'Digite o nome do lote.' };
  const existente = dados.lotes.find((l) => l.nome.toLowerCase() === limpo.toLowerCase());
  if (existente) return { valor: String(existente.id) };
  const erro = await salvar('lotes', { nome: limpo, descricao: null });
  if (erro) return { erro };
  // O nome é único: acha o lote recém-criado por ele (vale no modo exemplo e no banco).
  const novo = dados.lotes.find((l) => l.nome.toLowerCase() === limpo.toLowerCase());
  return novo ? { valor: String(novo.id) } : { erro: 'O lote foi criado, mas não apareceu na lista. Feche e abra de novo.' };
}
