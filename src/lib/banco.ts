// Gravação e leitura no Supabase. Só é usado quando o .env tem as chaves (ver src/components/app-shell.tsx).
import type { PostgrestError } from '@supabase/supabase-js';

import { type Base, BASE_VAZIA, conectar, definir, type Despesa, lerDados } from '@/lib/dados';
import { supabase } from '@/lib/supabase';

const TABELA: Record<keyof Base, string> = {
  lotes: 'lotes',
  animais: 'animais',
  insumos: 'insumos',
  tratos: 'tratos',
  despesas: 'despesas',
  recorrentes: 'despesas_recorrentes',
  pesagens: 'pesagens',
  sanidade: 'sanidade',
  funcionarios: 'funcionarios',
  maquinas: 'maquinas',
  fazenda: 'fazenda',
};

function mensagem(erro: PostgrestError): string {
  // Códigos do Postgres: as mesmas regras que as telas já checam, garantidas pelo banco.
  if (erro.code === '23505') return 'Já existe um registro com esses dados.';
  if (erro.code === '23503') return 'Este registro está em uso por outros lançamentos e não pode ser excluído.';
  if (erro.code === '23514') return 'Os dados não passaram numa regra do banco. Confira os valores.';
  return `Não foi possível salvar: ${erro.message}`;
}

/**
 * Lê tudo do banco e entrega às telas.
 * ponytail: carrega todas as linhas de todas as tabelas a cada gravação. Serve para uma fazenda;
 * quando pesar, filtrar despesas/tratos por período e ler o saldo da view estoque_insumos.
 */
export async function carregar(): Promise<void> {
  // Conta nova nasce pendente (ver supabase/migrations/0002_membros.sql). O banco só mostra a cada
  // pessoa a própria linha de `membros`; sem linha aprovada, as outras tabelas viriam vazias.
  const membro = await supabase.from('membros').select('aprovado, admin').maybeSingle();
  if (!membro.error && !membro.data?.aprovado) {
    definir(BASE_VAZIA, { carregado: true, erro: null, pendente: true });
    return;
  }
  // Lança as despesas recorrentes do mês (pode rodar quantas vezes for; não duplica).
  const recorrentes = await supabase.rpc('gerar_recorrentes');
  const leituras = await Promise.all(
    (Object.keys(TABELA) as (keyof Base)[]).map(async (colecao) => {
      const { data, error } = await supabase.from(TABELA[colecao]).select('*').order('id', { ascending: false });
      return { colecao, data, error };
    }),
  );
  const falha = membro.error ?? recorrentes.error ?? leituras.find((l) => l.error)?.error;
  if (falha) {
    // Mantém o que já estava na tela; só troca tudo por vazio se nunca carregou.
    const atual = lerDados();
    if (!atual.carregado) definir(BASE_VAZIA, { carregado: true, erro: `Não foi possível ler os dados: ${falha.message}` });
    return;
  }
  const base = Object.fromEntries(leituras.map((l) => [l.colecao, l.data ?? []])) as unknown as Base;
  base.despesas = (base.despesas as (Despesa & { recorrente_id: number | null })[]).map((d) => ({
    ...d,
    recorrente: d.recorrente_id != null,
  }));
  base.recorrentes = [...base.recorrentes].sort((a, b) => a.dia_vencimento - b.dia_vencimento);
  base.lotes = [...base.lotes].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  definir(base, { carregado: true, erro: null, admin: !!membro.data?.admin });
}

/** Passa o app a gravar no Supabase. A primeira leitura acontece em `carregar`, depois do login. */
export function ligarBanco() {
  conectar({
    async salvar(colecao, { id, ...campos }) {
      const tabela = supabase.from(TABELA[colecao]);
      const { error } = id != null ? await tabela.update(campos).eq('id', id) : await tabela.insert(campos);
      if (error) return mensagem(error);
      await carregar();
      return null;
    },
    async excluir(colecao, id) {
      const { error } = await supabase.from(TABELA[colecao]).delete().eq('id', id);
      if (error) return mensagem(error);
      await carregar();
      return null;
    },
    async salvarVarios(colecao, itens) {
      const tabela = () => supabase.from(TABELA[colecao]);
      const novos = itens.filter((i) => i.id == null);
      // Alterações iguais (ex.: o mesmo lote de destino para 40 animais) vão num pedido só.
      const grupos = new Map<string, { campos: Record<string, unknown>; ids: number[] }>();
      for (const { id, ...campos } of itens) {
        if (id == null) continue;
        const chave = JSON.stringify(campos);
        const grupo = grupos.get(chave) ?? { campos, ids: [] };
        grupo.ids.push(id);
        grupos.set(chave, grupo);
      }
      // ponytail: cada pedido é atômico (o insert inteiro entra ou não), mas o conjunto não é uma transação;
      // se um falhar, a releitura abaixo mostra o que foi gravado. Uma função no banco se isso pesar.
      const respostas = await Promise.all([
        ...(novos.length ? [tabela().insert(novos)] : []),
        ...[...grupos.values()].map((g) => tabela().update(g.campos).in('id', g.ids)),
      ]);
      await carregar();
      const erro = respostas.find((r) => r.error)?.error;
      return erro ? mensagem(erro) : null;
    },
  });
}
