'use client';

import { useState } from 'react';

import { type Campo, Formulario, type Valores } from '@/components/formulario';
import { Botao, CAMPO, Cartao, Chip, Chips, Etiqueta, Grade, Icone, Linha, Secao, Tela, Vazio } from '@/components/ui';
import { type Animal, diaMes, excluir, type Lote, loteEmUso, nomeLote, numero, reais, salvar, useDados } from '@/lib/dados';
import { num, numParaTexto } from '@/lib/formato';

const SAIDA = { venda: 'Vendido', morte: 'Morte', abate: 'Abate' } as const;

/** Dados de cadastro do animal: usados na entrada (novo) e em "Editar dados". */
const CAMPOS_CADASTRO: Campo[] = [
  { chave: 'brinco', rotulo: 'Brinco', dica: 'Ex.: 0107' },
  { chave: 'sexo', rotulo: 'Sexo', tipo: 'opcoes', opcoes: [{ valor: 'M', rotulo: 'Macho' }, { valor: 'F', rotulo: 'Fêmea' }] },
  { chave: 'raca', rotulo: 'Raça', dica: 'Ex.: Nelore' },
  { chave: 'e_tipo', rotulo: 'Tipo de entrada', tipo: 'opcoes', opcoes: [{ valor: 'compra', rotulo: 'Compra' }, { valor: 'nascimento', rotulo: 'Nascimento' }] },
  { chave: 'e_data', rotulo: 'Data da entrada', tipo: 'data' },
  { chave: 'e_peso', rotulo: 'Peso na entrada (kg)', tipo: 'numero' },
  { chave: 'e_valor', rotulo: 'Valor pago (R$)', tipo: 'numero', opcional: true },
];

const cadastro = (v: Valores) => ({
  brinco: v.brinco.trim(),
  sexo: v.sexo as 'M' | 'F',
  raca: v.raca.trim(),
  entrada_tipo: v.e_tipo as 'compra' | 'nascimento',
  entrada_data: v.e_data,
  entrada_peso: num(v.e_peso),
  entrada_valor: v.e_valor.trim() ? num(v.e_valor) : null,
});

export default function Rebanho() {
  const { lotes, animais } = useDados();
  const opcoesLote = lotes.map((l) => ({ valor: String(l.id), rotulo: l.nome }));
  // { item } = editando aquele lote; {} = novo; null = fechado.
  const [formLote, setFormLote] = useState<{ item?: Lote } | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [selecionado, setSelecionado] = useState<Animal | null>(null);
  const [busca, setBusca] = useState('');
  const [lote, setLote] = useState<number | null>(null);
  const [soAtivos, setSoAtivos] = useState(true);

  const ativos = animais.filter((a) => !a.saida_data);
  const lista = animais.filter(
    (a) => (!soAtivos || !a.saida_data) && (lote === null || a.lote_id === lote) && a.brinco.includes(busca.trim()),
  );

  /** Brinco já usado por outro animal ativo (o banco tem a mesma regra). */
  const brincoEmUso = (brinco: string, ignorarId?: number) =>
    ativos.some((a) => a.brinco === brinco.trim() && a.id !== ignorarId) ? `Já existe um animal ativo com o brinco ${brinco.trim()}.` : null;

  const selecionadoAtivo = !selecionado?.saida_data;

  return (
    <Tela>
      <Grade>
        <Cartao rotulo="Ativos" valor={numero(ativos.length)} />
        <Cartao rotulo="Machos" valor={numero(ativos.filter((a) => a.sexo === 'M').length)} />
        <Cartao rotulo="Fêmeas" valor={numero(ativos.filter((a) => a.sexo === 'F').length)} />
        <Cartao rotulo="Lotes" valor={numero(lotes.length)} />
      </Grade>

      <div className="flex flex-col gap-3">
        <label className="relative block">
          <span className="sr-only">Buscar por brinco</span>
          <Icone nome="buscar" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-texto-2" />
          <input
            className={`${CAMPO} rounded-2xl bg-cartao pl-12`}
            placeholder="Buscar por brinco"
            inputMode="numeric"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </label>

        <Chips>
          <Chip titulo="Todos" ativo={lote === null} onClick={() => setLote(null)} />
          {lotes.map((l) => (
            <Chip key={l.id} titulo={l.nome} ativo={lote === l.id} onClick={() => setLote(l.id)} />
          ))}
          <Chip titulo="Mostrar saídas" ativo={!soAtivos} onClick={() => setSoAtivos(!soAtivos)} />
        </Chips>
      </div>

      <Secao titulo={`Animais (${lista.length})`} acao={<Botao titulo="+ Entrada" onClick={() => setFormAberto(true)} />}>
        {lista.length === 0 && <Vazio>Nenhum animal encontrado.</Vazio>}
        {lista.map((a) => (
          <Linha
            key={a.id}
            marca={a.brinco}
            titulo={`${a.raca} · ${a.sexo === 'M' ? 'Macho' : 'Fêmea'}`}
            subtitulo={`${nomeLote(lotes, a.lote_id)} · ${a.entrada_tipo} em ${diaMes(a.entrada_data)}`}
            valor={a.saida_valor ? reais(a.saida_valor) : `${numero(a.entrada_peso)} kg`}
            etiqueta={a.saida_tipo && <Etiqueta texto={SAIDA[a.saida_tipo]} tom={a.saida_tipo === 'morte' ? 'alerta' : 'neutro'} />}
            apagada={!!a.saida_data}
            onClick={() => setSelecionado(a)}
            dicaAcao="Abrir opções deste animal"
          />
        ))}
      </Secao>
      <p className="text-sm font-medium text-texto-2">Clique em um animal para mover de lote, registrar a saída, editar ou excluir.</p>

      <Secao titulo={`Lotes (${lotes.length})`} acao={<Botao titulo="+ Lote" onClick={() => setFormLote({})} />}>
        {lotes.length === 0 && <Vazio>Nenhum lote cadastrado. Comece por aqui: os animais entram em um lote.</Vazio>}
        {lotes.map((l) => (
          <Linha
            key={l.id}
            titulo={l.nome}
            subtitulo={l.descricao ?? undefined}
            valor={`${numero(ativos.filter((a) => a.lote_id === l.id).length)} cab.`}
            onClick={() => setFormLote({ item: l })}
            dicaAcao="Editar ou excluir este lote"
          />
        ))}
      </Secao>

      {formLote && (
        <Formulario
          titulo={formLote.item ? 'Editar lote' : 'Novo lote'}
          campos={[
            { chave: 'nome', rotulo: 'Nome', dica: 'Ex.: Pasto do Fundo' },
            { chave: 'descricao', rotulo: 'Descrição', opcional: true, dica: 'Ex.: 12 hectares, braquiária' },
          ]}
          iniciais={formLote.item && { nome: formLote.item.nome, descricao: formLote.item.descricao ?? '' }}
          validar={(v) =>
            lotes.some((l) => l.nome.toLowerCase() === v.nome.trim().toLowerCase() && l.id !== formLote.item?.id)
              ? 'Já existe um lote com esse nome.'
              : null
          }
          onSalvar={(v) =>
            salvar('lotes', { ...(formLote.item && { id: formLote.item.id }), nome: v.nome.trim(), descricao: v.descricao.trim() || null })
          }
          onExcluir={
            formLote.item &&
            (() => {
              const { id } = formLote.item!;
              if (loteEmUso(id)) return 'Este lote tem animais ou tratos lançados. Mova os animais e exclua os tratos antes.';
              if (lote === id) setLote(null);
              return excluir('lotes', id);
            })
          }
          onFechar={() => setFormLote(null)}
        />
      )}

      {formAberto && (
        <Formulario
          titulo="Entrada de animal"
          campos={[...CAMPOS_CADASTRO.slice(0, 3), { chave: 'lote', rotulo: 'Lote', tipo: 'opcoes', opcoes: opcoesLote }, ...CAMPOS_CADASTRO.slice(3)]}
          validar={(v) => (v.lote ? brincoEmUso(v.brinco) : 'Cadastre um lote antes de dar entrada em animais.')}
          onSalvar={(v) => salvar('animais', { ...cadastro(v), lote_id: Number(v.lote), saida_data: null, saida_tipo: null, saida_valor: null })}
          onFechar={() => setFormAberto(false)}
        />
      )}

      {selecionado && (
        <Formulario
          titulo={`Animal ${selecionado.brinco}`}
          campos={[
            {
              chave: 'acao',
              rotulo: 'O que fazer',
              tipo: 'opcoes',
              opcoes: selecionadoAtivo
                ? [{ valor: 'mover', rotulo: 'Mover de lote' }, { valor: 'saida', rotulo: 'Registrar saída' }, { valor: 'editar', rotulo: 'Editar dados' }]
                : [{ valor: 'editar', rotulo: 'Editar dados' }, { valor: 'desfazer', rotulo: 'Desfazer saída' }],
            },
            {
              chave: 'lote',
              rotulo: `Novo lote (hoje em ${nomeLote(lotes, selecionado.lote_id)})`,
              tipo: 'opcoes',
              opcoes: opcoesLote.filter((o) => o.valor !== String(selecionado.lote_id)),
              quando: (v) => v.acao === 'mover',
            },
            { chave: 's_tipo', rotulo: 'Motivo', tipo: 'opcoes', opcoes: [{ valor: 'venda', rotulo: 'Venda' }, { valor: 'abate', rotulo: 'Abate' }, { valor: 'morte', rotulo: 'Morte' }], quando: (v) => v.acao === 'saida' },
            { chave: 's_data', rotulo: 'Data da saída', tipo: 'data', quando: (v) => v.acao === 'saida' },
            { chave: 's_peso', rotulo: 'Peso na saída (kg)', tipo: 'numero', opcional: true, quando: (v) => v.acao === 'saida' },
            { chave: 's_valor', rotulo: 'Valor recebido (R$)', tipo: 'numero', opcional: true, dica: 'Obrigatório em venda', quando: (v) => v.acao === 'saida' },
            ...CAMPOS_CADASTRO.map((c) => ({ ...c, quando: (v: Valores) => v.acao === 'editar' })),
          ]}
          iniciais={{
            brinco: selecionado.brinco,
            sexo: selecionado.sexo,
            raca: selecionado.raca,
            e_tipo: selecionado.entrada_tipo,
            e_data: selecionado.entrada_data,
            e_peso: numParaTexto(selecionado.entrada_peso),
            e_valor: selecionado.entrada_valor ? numParaTexto(selecionado.entrada_valor) : '',
          }}
          validar={(v) => {
            if (v.acao === 'mover' && !v.lote) return 'Não há outro lote para onde mover. Cadastre um lote primeiro.';
            if (v.acao === 'saida') {
              if (v.s_data < selecionado.entrada_data) return `A saída não pode ser antes da entrada (${diaMes(selecionado.entrada_data)}).`;
              if (v.s_tipo === 'venda' && !v.s_valor.trim()) return 'Informe o valor recebido na venda.';
            }
            if (v.acao === 'editar') {
              if (selecionado.saida_data && v.e_data > selecionado.saida_data) return `A entrada não pode ser depois da saída (${diaMes(selecionado.saida_data)}).`;
              // Animal que já saiu não disputa brinco com os ativos.
              if (selecionadoAtivo) return brincoEmUso(v.brinco, selecionado.id);
            }
            if (v.acao === 'desfazer') return brincoEmUso(selecionado.brinco, selecionado.id);
            return null;
          }}
          onSalvar={(v) => {
            const id = selecionado.id;
            if (v.acao === 'mover') return salvar('animais', { id, lote_id: Number(v.lote) });
            if (v.acao === 'editar') return salvar('animais', { id, ...cadastro(v) });
            if (v.acao === 'desfazer') return salvar('animais', { id, saida_data: null, saida_tipo: null, saida_peso: null, saida_valor: null });
            return salvar('animais', {
              id,
              saida_tipo: v.s_tipo as 'venda' | 'morte' | 'abate',
              saida_data: v.s_data,
              saida_peso: v.s_peso.trim() ? num(v.s_peso) : null,
              saida_valor: v.s_valor.trim() ? num(v.s_valor) : null,
            });
          }}
          onExcluir={() => excluir('animais', selecionado.id)}
          onFechar={() => setSelecionado(null)}
        />
      )}
    </Tela>
  );
}
