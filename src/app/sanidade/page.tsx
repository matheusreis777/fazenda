'use client';

import { useState } from 'react';

import { Formulario } from '@/components/formulario';
import { Botao, Cartao, Chip, Chips, Etiqueta, Grade, Linha, Secao, Tela, Vazio } from '@/components/ui';
import { diaMes, dias, excluir, nomeLote, numero, proximosManejos, salvar, type Sanidade, somarDias, TIPOS_SANIDADE, type TipoSanidade, useDados } from '@/lib/dados';
import { hojeIso } from '@/lib/formato';

const OPCOES_TIPO = (Object.keys(TIPOS_SANIDADE) as TipoSanidade[]).map((t) => ({ valor: t, rotulo: TIPOS_SANIDADE[t] }));
/** Quantos dias à frente a lista "A fazer" olha. */
const JANELA_DIAS = 30;

export default function SanidadePage() {
  const { lotes, animais, sanidade } = useDados();
  // { item } = editando; { repetir } = nova aplicação a partir de uma antiga; {} = nova; null = fechado.
  const [form, setForm] = useState<{ item?: Sanidade; repetir?: Sanidade } | null>(null);
  const [tipo, setTipo] = useState<TipoSanidade | null>(null);

  const hoje = hojeIso();
  const ativos = animais.filter((a) => !a.saida_data);
  const aFazer = proximosManejos(sanidade, somarDias(hoje, JANELA_DIAS));
  const atrasados = aFazer.filter((s) => s.proxima_data! < hoje);
  const doMes = sanidade.filter((s) => s.data.slice(0, 7) === hoje.slice(0, 7));
  const historico = sanidade.filter((s) => tipo === null || s.tipo === tipo);

  const alvo = (s: Sanidade) => {
    if (s.lote_id) return `Lote ${nomeLote(lotes, s.lote_id)}`;
    const animal = animais.find((a) => a.id === s.animal_id);
    return animal ? `Brinco ${animal.brinco}` : 'Animal excluído';
  };

  /** "vence em 5 dias", "venceu há 3 dias", "vence hoje". */
  const prazo = (data: string) => {
    const n = dias(hoje, data);
    if (n === 0) return 'vence hoje';
    return n > 0 ? `vence em ${n} ${n === 1 ? 'dia' : 'dias'}` : `atrasado ${-n} ${n === -1 ? 'dia' : 'dias'}`;
  };

  const base = form?.item ?? form?.repetir;

  return (
    <Tela>
      <Grade>
        <Cartao icone="alerta" rotulo="Atrasados" valor={numero(atrasados.length)} detalhe="doses vencidas" alerta={atrasados.length > 0} />
        <Cartao rotulo={`Próximos ${JANELA_DIAS} dias`} valor={numero(aFazer.length - atrasados.length)} detalhe="a aplicar" />
        <Cartao rotulo="Aplicações no mês" valor={numero(doMes.length)} />
      </Grade>

      <Secao titulo="A fazer" acao={<Botao titulo="+ Aplicação" onClick={() => setForm({})} />}>
        {aFazer.length === 0 && <Vazio>Nada a aplicar nos próximos {JANELA_DIAS} dias.</Vazio>}
        {aFazer.map((s) => {
          const atrasado = s.proxima_data! < hoje;
          return (
            <Linha
              key={s.id}
              marca={diaMes(s.proxima_data!)}
              titulo={`${s.produto} · ${alvo(s)}`}
              subtitulo={`${TIPOS_SANIDADE[s.tipo]} · última em ${diaMes(s.data)}`}
              etiqueta={<Etiqueta texto={prazo(s.proxima_data!)} tom={atrasado ? 'alerta' : 'neutro'} />}
              onClick={() => setForm({ repetir: s })}
              dicaAcao="Registrar esta aplicação"
            />
          );
        })}
      </Secao>
      <p className="text-sm font-medium text-texto-2">Clique em um item de “A fazer” para registrar a aplicação; ele sai da lista.</p>

      <Chips>
        <Chip titulo="Todos" ativo={tipo === null} onClick={() => setTipo(null)} />
        {OPCOES_TIPO.map((t) => (
          <Chip key={t.valor} titulo={t.rotulo} ativo={tipo === t.valor} onClick={() => setTipo(t.valor)} />
        ))}
      </Chips>

      <Secao titulo={`Histórico (${historico.length})`}>
        {historico.length === 0 && <Vazio>Nenhuma aplicação registrada.</Vazio>}
        {historico.map((s) => (
          <Linha
            key={s.id}
            marca={diaMes(s.data)}
            titulo={`${s.produto} · ${alvo(s)}`}
            subtitulo={[TIPOS_SANIDADE[s.tipo], s.proxima_data && `repetir em ${diaMes(s.proxima_data)}`, s.observacao].filter(Boolean).join(' · ')}
            onClick={() => setForm({ item: s })}
            dicaAcao="Editar ou excluir esta aplicação"
          />
        ))}
      </Secao>

      {form && (
        <Formulario
          titulo={form.item ? 'Editar aplicação' : 'Nova aplicação'}
          campos={[
            { chave: 'data', rotulo: 'Data da aplicação', tipo: 'data' },
            { chave: 'tipo', rotulo: 'Tipo', tipo: 'opcoes', opcoes: OPCOES_TIPO },
            { chave: 'produto', rotulo: 'Produto', dica: 'Ex.: Febre aftosa, Ivermectina 1%' },
            {
              chave: 'alvo',
              rotulo: 'Aplicado em',
              tipo: 'opcoes',
              opcoes: [
                { valor: 'lote', rotulo: 'Um lote inteiro' },
                { valor: 'animal', rotulo: 'Um animal' },
              ],
            },
            {
              chave: 'lote',
              rotulo: 'Lote',
              tipo: 'opcoes',
              opcoes: lotes.map((l) => ({ valor: String(l.id), rotulo: l.nome })),
              quando: (v) => v.alvo === 'lote',
            },
            {
              chave: 'animal',
              rotulo: 'Brinco do animal',
              dica: 'Ex.: 0101',
              quando: (v) => v.alvo === 'animal',
            },
            { chave: 'proxima', rotulo: 'Repetir em', tipo: 'data', opcional: true },
            { chave: 'observacao', rotulo: 'Observação', opcional: true, dica: 'Dose, lote do produto, veterinário…' },
          ]}
          iniciais={
            base && {
              tipo: base.tipo,
              produto: base.produto,
              alvo: base.lote_id ? 'lote' : 'animal',
              lote: base.lote_id ? String(base.lote_id) : String(lotes[0]?.id ?? ''),
              animal: animais.find((a) => a.id === base.animal_id)?.brinco ?? '',
              observacao: base.observacao ?? '',
              // Ao repetir, a data é hoje e a próxima fica em branco para a pessoa decidir.
              ...(form.item ? { data: base.data, proxima: base.proxima_data ?? '' } : { proxima: '' }),
            }
          }
          validar={(v) => {
            if (v.alvo === 'lote' && !v.lote) return 'Cadastre um lote antes, na tela Rebanho.';
            if (v.alvo === 'animal' && !ativos.some((a) => a.brinco === v.animal.trim()) && !(form.item && v.animal.trim() === animais.find((a) => a.id === form.item!.animal_id)?.brinco)) {
              return `Nenhum animal ativo com o brinco ${v.animal.trim()}.`;
            }
            if (v.proxima && v.proxima < v.data) return 'A data para repetir não pode ser antes da aplicação.';
            return null;
          }}
          onSalvar={(v) => {
            const animal = animais.find((a) => a.brinco === v.animal.trim() && (!a.saida_data || a.id === form.item?.animal_id));
            return salvar('sanidade', {
              ...(form.item && { id: form.item.id }),
              data: v.data,
              tipo: v.tipo as TipoSanidade,
              produto: v.produto.trim(),
              animal_id: v.alvo === 'animal' ? (animal?.id ?? null) : null,
              lote_id: v.alvo === 'lote' ? Number(v.lote) : null,
              proxima_data: v.proxima || null,
              observacao: v.observacao.trim() || null,
            });
          }}
          onExcluir={form.item && (() => excluir('sanidade', form.item!.id))}
          onFechar={() => setForm(null)}
        />
      )}
    </Tela>
  );
}
