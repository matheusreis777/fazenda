'use client';

import { useState } from 'react';

import { Formulario } from '@/components/formulario';
import { CartaoGrupo, contem, Etiqueta, Grupos, Linha, Opcoes, Secao, Tela, Topo, Trilha, usePaginacao, useVista, Vazio } from '@/components/ui';
import { criarLote, diaMes, dias, excluir, nomeLote, numero, proximosManejos, salvar, type Sanidade, somarDias, TIPOS_SANIDADE, type TipoSanidade, useDados } from '@/lib/dados';
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
  const alvo = (s: Sanidade) => {
    if (s.lote_id) return `Lote ${nomeLote(lotes, s.lote_id)}`;
    const animal = animais.find((a) => a.id === s.animal_id);
    return animal ? `Brinco ${animal.brinco}` : 'Animal excluído';
  };

  const emBreve = aFazer.filter((s) => s.proxima_data! >= hoje);
  const [busca, setBusca] = useState('');
  // O que a tela mostra: ?atrasadas, ?breve, ?historico ou, sem nada, os cartões.
  const { ver, abrir } = useVista(['atrasadas', 'breve', 'historico'], () => {
    setBusca('');
    setTipo(null);
  });
  const vista = ver ?? 'inicio';
  const voltar = () => abrir();

  const termo = busca.trim();
  const temTermo = (s: Sanidade) => contem(s.produto, termo) || contem(alvo(s), termo);
  // Na tela inicial a busca procura no histórico todo; dentro de uma lista, filtra só aquela lista.
  const lista =
    vista === 'atrasadas' ? atrasados.filter(temTermo) : vista === 'breve' ? emBreve.filter(temTermo) : sanidade.filter((s) => temTermo(s) && (tipo === null || s.tipo === tipo));
  const pag = usePaginacao(lista, [vista, termo, tipo]);

  /** "vence em 5 dias", "venceu há 3 dias", "vence hoje". */
  const prazo = (data: string) => {
    const n = dias(hoje, data);
    if (n === 0) return 'vence hoje';
    return n > 0 ? `vence em ${n} ${n === 1 ? 'dia' : 'dias'}` : `atrasado ${-n} ${n === -1 ? 'dia' : 'dias'}`;
  };

  const base = form?.item ?? form?.repetir;

  /** Dose marcada (atrasada ou em breve): tocar registra a aplicação. */
  const linhaAFazer = (s: Sanidade) => (
    <Linha
      key={s.id}
      marca={diaMes(s.proxima_data!)}
      titulo={`${s.produto} · ${alvo(s)}`}
      subtitulo={`${TIPOS_SANIDADE[s.tipo]} · última em ${diaMes(s.data)}`}
      etiqueta={<Etiqueta texto={prazo(s.proxima_data!)} tom={s.proxima_data! < hoje ? 'alerta' : 'neutro'} />}
      onClick={() => setForm({ repetir: s })}
      dicaAcao="Registrar que esta dose foi aplicada"
    />
  );
  const linhaHistorico = (s: Sanidade) => (
    <Linha
      key={s.id}
      marca={diaMes(s.data)}
      titulo={`${s.produto} · ${alvo(s)}`}
      subtitulo={[TIPOS_SANIDADE[s.tipo], s.proxima_data && `repetir em ${diaMes(s.proxima_data)}`, s.observacao].filter(Boolean).join(' · ')}
      onClick={() => setForm({ item: s })}
      dicaAcao="Corrigir ou apagar esta aplicação"
    />
  );
  // Os nomes dos cartões do início, para a trilha bater com o que foi tocado.
  const trilha = vista !== 'inicio' && (
    <Trilha raiz="Sanidade" onVoltar={voltar} aqui={{ atrasadas: 'Atrasadas', breve: 'Para aplicar', historico: 'Já aplicadas' }[vista]} />
  );

  return (
    <Tela>
      {/* ---------- Topo fixo: busca e registro ---------- */}
      <Topo busca={busca} onBusca={setBusca} dica="Procurar produto, lote ou brinco" novo="+ Aplicação" rotuloNovo="Registrar aplicação" onNovo={() => setForm({})}>
        {numero(atrasados.length)} {atrasados.length === 1 ? 'atrasada' : 'atrasadas'} · {numero(emBreve.length)} para os próximos {JANELA_DIAS} dias ·{' '}
        {numero(doMes.length)} aplicadas neste mês
      </Topo>

      {vista === 'inicio' && termo ? (
        /* ---------- Resultado da busca ---------- */
        <Secao titulo={`Aplicações com “${termo}” (${lista.length})`} descricao="Toque para corrigir ou apagar." rodape={pag.controles}>
          {lista.length === 0 && <Vazio>Nenhuma aplicação com esse produto, lote ou brinco.</Vazio>}
          {pag.itens.map(linhaHistorico)}
        </Secao>
      ) : vista === 'atrasadas' || vista === 'breve' ? (
        /* ---------- Doses marcadas ---------- */
        <>
          {trilha}
          <Secao
            titulo={vista === 'atrasadas' ? `Atrasadas (${lista.length})` : `Para aplicar nos próximos ${JANELA_DIAS} dias (${lista.length})`}
            descricao="Depois de aplicar, toque no item para registrar: ele sai da lista."
            rodape={pag.controles}>
            {lista.length === 0 && (
              <Vazio>{termo ? 'Nenhuma dose com esse produto, lote ou brinco.' : vista === 'atrasadas' ? 'Nenhuma dose atrasada.' : `Nada para aplicar nos próximos ${JANELA_DIAS} dias.`}</Vazio>
            )}
            {pag.itens.map(linhaAFazer)}
          </Secao>
        </>
      ) : vista === 'historico' ? (
        /* ---------- Histórico ---------- */
        <>
          {trilha}
          <Secao
            titulo={`Histórico (${lista.length})`}
            descricao="Tudo o que já foi aplicado. Toque para corrigir ou apagar."
            filtros={
              sanidade.length > 0 && (
                <Opcoes rotulo="Filtrar por tipo" valor={tipo ?? ''} onMudar={(v) => setTipo(v || null)} opcoes={[{ valor: '', rotulo: 'Todos os tipos' }, ...OPCOES_TIPO]} />
              )
            }
            rodape={pag.controles}>
            {lista.length === 0 && <Vazio>{sanidade.length === 0 ? 'Nenhuma aplicação registrada ainda.' : 'Nenhuma aplicação com esse filtro.'}</Vazio>}
            {pag.itens.map(linhaHistorico)}
          </Secao>
        </>
      ) : (
        /* ---------- Início: um cartão por situação ---------- */
        <Grupos titulo="Vacinas e remédios" vazio={sanidade.length === 0 && 'Registre a primeira aplicação em “+ Aplicação”. Se marcar a próxima dose, o app avisa quando estiver chegando.'}>
          <CartaoGrupo
            titulo="Atrasadas"
            valor={numero(atrasados.length)}
            unidade={atrasados.length === 1 ? 'dose' : 'doses'}
            alerta={atrasados.length > 0}
            detalhes={[atrasados.length > 0 ? 'já passaram da data' : 'nada atrasado']}
            onClick={() => abrir('atrasadas')}
          />
          <CartaoGrupo
            titulo="Para aplicar"
            valor={numero(emBreve.length)}
            unidade={emBreve.length === 1 ? 'dose' : 'doses'}
            detalhes={[`nos próximos ${JANELA_DIAS} dias`, emBreve[0] && `a próxima em ${diaMes(emBreve[0].proxima_data!)}`]}
            onClick={() => abrir('breve')}
          />
          <CartaoGrupo
            titulo="Já aplicadas"
            valor={numero(sanidade.length)}
            unidade={sanidade.length === 1 ? 'aplicação' : 'aplicações'}
            detalhes={[`${numero(doMes.length)} neste mês`]}
            onClick={() => abrir('historico')}
          />
        </Grupos>
      )}

      {form && (
        <Formulario
          titulo={form.item ? 'Corrigir aplicação' : form.repetir ? `Aplicar ${form.repetir.produto}` : 'Registrar aplicação'}
          descricao={form.repetir ? `Confira os dados e salve. ${alvo(form.repetir)} sai da lista “Para aplicar”.` : undefined}
          campos={[
            { chave: 'tipo', rotulo: 'O que foi aplicado', tipo: 'opcoes', opcoes: OPCOES_TIPO },
            { chave: 'produto', rotulo: 'Nome do produto', dica: 'Ex.: Febre aftosa, Ivermectina 1%' },
            {
              chave: 'alvo',
              rotulo: 'Em quem',
              tipo: 'opcoes',
              opcoes: [
                { valor: 'lote', rotulo: 'Em um lote inteiro' },
                { valor: 'animal', rotulo: 'Em um animal só' },
              ],
            },
            {
              chave: 'lote',
              rotulo: 'Qual lote',
              tipo: 'opcoes',
              opcoes: lotes.map((l) => ({ valor: String(l.id), rotulo: l.nome })),
              novo: { rotulo: '+ Novo lote', dica: 'Ex.: Pasto do Fundo', criar: criarLote },
              quando: (v) => v.alvo === 'lote',
            },
            {
              chave: 'animal',
              rotulo: 'Número do brinco',
              dica: 'Ex.: 0101',
              quando: (v) => v.alvo === 'animal',
            },
            { chave: 'data', rotulo: 'Data da aplicação', tipo: 'data' },
            {
              chave: 'proxima',
              rotulo: 'Quando aplicar de novo',
              tipo: 'data',
              opcional: true,
              ajuda: 'Se precisa de outra dose ou reforço, escolha a data: o app avisa quando estiver chegando.',
            },
            { chave: 'observacao', rotulo: 'Observação', opcional: true, dica: 'Dose, veterinário…' },
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
            if (v.alvo === 'lote' && !v.lote) return 'Escolha o lote ou crie um em “+ Novo lote”.';
            if (v.alvo === 'animal' && !ativos.some((a) => a.brinco === v.animal.trim()) && !(form.item && v.animal.trim() === animais.find((a) => a.id === form.item!.animal_id)?.brinco)) {
              return `Não achei nenhum animal no rebanho com o brinco ${v.animal.trim()}. Confira o número.`;
            }
            if (v.proxima && v.proxima < v.data) return 'A data da próxima dose precisa ser depois da aplicação.';
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
          salvarTexto={form.item ? 'Salvar correção' : 'Registrar aplicação'}
          sucesso={form.item ? 'Aplicação corrigida.' : 'Aplicação registrada.'}
          excluirTexto="Apagar aplicação"
          onFechar={() => setForm(null)}
        />
      )}
    </Tela>
  );
}
