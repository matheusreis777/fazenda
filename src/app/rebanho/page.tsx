'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { type Campo, Formulario, marcados, type Valores, Varios } from '@/components/formulario';
import { Botao, Cartao, CartaoGrupo, Confirmacao, Etiqueta, Grade, Grupos, Janela, Linha, MenuAcoes, Opcoes, Secao, Tela, Topo, Trilha, usePaginacao, useVista, Vazio } from '@/components/ui';
import {
  type Animal,
  criarLote,
  diaMes,
  evolucaoPeso,
  excluir,
  faixaBrincos,
  type Lote,
  loteEmUso,
  nomeLote,
  numero,
  type Pesagem,
  ratear,
  reais,
  resumoGta,
  salvar,
  salvarVarios,
  useDados,
} from '@/lib/dados';
import { dataCurta } from '@/lib/certidao';
import { hojeIso, num, numParaTexto, textoPeso } from '@/lib/formato';

const SAIDA = { venda: 'Vendido', morte: 'Morreu', abate: 'Abatido' } as const;

/** 0,8123 → '0,81 kg por dia' */
const kgDia = (gmd: number) => `${gmd.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg/dia`;

/** Dados de cadastro do animal: usados no cadastro (novo) e em "Corrigir dados". */
const CAMPOS_CADASTRO: Campo[] = [
  { chave: 'brinco', rotulo: 'Número do brinco', dica: 'Ex.: 0107', ajuda: 'O número da etiqueta na orelha do animal.' },
  { chave: 'sexo', rotulo: 'Sexo', tipo: 'opcoes', opcoes: [{ valor: 'M', rotulo: 'Macho' }, { valor: 'F', rotulo: 'Fêmea' }] },
  { chave: 'raca', rotulo: 'Raça', dica: 'Ex.: Nelore' },
  {
    chave: 'e_tipo',
    rotulo: 'Como o animal chegou',
    tipo: 'opcoes',
    opcoes: [
      { valor: 'compra', rotulo: 'Comprado' },
      { valor: 'nascimento', rotulo: 'Nasceu na fazenda' },
    ],
  },
  { chave: 'e_data', rotulo: 'Data em que chegou ou nasceu', tipo: 'data' },
  { chave: 'e_peso', rotulo: 'Peso nesse dia', tipo: 'peso', dica: 'Ex.: 210', ajuda: 'Em quilos ou em arrobas (@). Se não pesou, coloque um peso aproximado.' },
  { chave: 'e_valor', rotulo: 'Quanto pagou (R$)', tipo: 'numero', opcional: true, dica: 'Ex.: 3200', ajuda: 'Deixe em branco se nasceu na fazenda.' },
  {
    chave: 'nasc',
    rotulo: 'Data de nascimento',
    tipo: 'data',
    opcional: true,
    ajuda: 'Se não souber o dia, coloque uma data aproximada. Serve para mostrar a idade.',
    quando: (v) => v.e_tipo === 'compra',
  },
  { chave: 'e_gta', rotulo: 'Número da GTA', opcional: true, dica: 'Ex.: 123456', ajuda: 'A guia que veio com o animal na compra.', quando: (v) => v.e_tipo === 'compra' },
];

/** Número da GTA da saída (venda ou abate): a guia emitida no e-SANIAGRO para o transporte. */
const CAMPO_GTA_SAIDA: Campo = { chave: 'gta', rotulo: 'Número da GTA', opcional: true, dica: 'Ex.: 123456', ajuda: 'A guia emitida para o transporte.' };
/** Texto digitado → valor do banco (vazio vira null). */
const gta = (v: string | undefined) => v?.trim() || null;

/** Nascimento não pode ser depois da chegada (nos nascidos na fazenda, a chegada é o nascimento). */
const nascimentoInvalido = (v: Valores) => (v.e_tipo === 'compra' && v.nasc && v.nasc > v.e_data ? 'O nascimento não pode ser depois da chegada.' : null);

const cadastro = (v: Valores) => ({
  brinco: v.brinco.trim(),
  sexo: v.sexo as 'M' | 'F',
  raca: v.raca.trim(),
  entrada_tipo: v.e_tipo as 'compra' | 'nascimento',
  entrada_data: v.e_data,
  entrada_peso: num(v.e_peso),
  entrada_valor: v.e_valor.trim() ? num(v.e_valor) : null,
  nascimento: v.e_tipo === 'nascimento' ? v.e_data : v.nasc || null,
  entrada_gta: v.e_tipo === 'compra' ? gta(v.e_gta) : null,
});

/** O que está aberto na tela: o menu do animal, um dos formulários dele, ou nada. */
type Aberto =
  | { tela: 'menu' | 'pesar' | 'mover' | 'saida' | 'corrigir' | 'desfazer' | 'excluir'; animal: Animal }
  | { tela: 'novo' | 'compraVarios'; lote?: number }
  | { tela: 'acoesLote' | 'pesarLote' | 'moverVarios' | 'venderVarios' | 'gta' | 'nascVarios'; lote: Lote }
  | { tela: 'lote'; lote?: Lote }
  | { tela: 'pesagem'; pesagem: Pesagem }
  | null;

/** O que a tela mostra: os cartões dos lotes, os animais de um lote, os que saíram ou as pesagens. */
const media = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

export default function Rebanho() {
  const { lotes, animais, pesagens } = useDados();
  const router = useRouter();
  /** Primeira opção do menu do animal, para quem tem ou já teve o animal. */
  const verCertidao = (a: Animal) => ({
    titulo: 'Ver certidão',
    descricao: 'Tudo sobre o animal num documento: entrada, pesos, sanidade, saída e valores. Dá para imprimir ou salvar em PDF.',
    onClick: () => router.push(`/rebanho/certidao?animal=${a.id}`),
  });
  const [aberto, setAberto] = useState<Aberto>(null);
  const fechar = () => setAberto(null);
  const [busca, setBusca] = useState('');
  const [sexo, setSexo] = useState<'' | 'M' | 'F'>('');
  const [tipoSaida, setTipoSaida] = useState<'' | keyof typeof SAIDA>('');
  // O que a tela mostra: /rebanho?lote=ID (os pastos do Início também abrem assim), ?saidas, ?pesagens ou,
  // sem nada, os cartões dos lotes.
  const { ver, id, abrir } = useVista(['lote', 'saidas', 'pesagens'], () => {
    setBusca('');
    setSexo('');
    setTipoSaida('');
  });
  const voltar = () => abrir();

  const opcoesLote = lotes.map((l) => ({ valor: String(l.id), rotulo: l.nome }));
  const ativos = animais.filter((a) => !a.saida_data);
  const saidos = animais.filter((a) => a.saida_data).sort((a, b) => b.saida_data!.localeCompare(a.saida_data!));
  const evolucao = new Map(animais.map((a) => [a.id, evolucaoPeso(a, pesagens)]));
  const brincoDe = (id: number) => animais.find((a) => a.id === id)?.brinco ?? '—';
  /** Ativos de um lote em ordem de brinco (0099 antes de 0100), para as ações em lote. */
  const animaisDo = (lote: Lote) => ativos.filter((a) => a.lote_id === lote.id).sort((a, b) => a.brinco.localeCompare(b.brinco, 'pt-BR', { numeric: true }));
  const opcoesBrinco = (grupo: Animal[]) => grupo.map((a) => ({ valor: String(a.id), rotulo: a.brinco }));

  /** Cabeças, peso médio e ganho médio por dia de um grupo de animais. */
  const resumoGrupo = (grupo: Animal[]) => ({
    cabecas: grupo.length,
    peso: media(grupo.map((a) => evolucao.get(a.id)!.peso)),
    gmd: media(grupo.map((a) => evolucao.get(a.id)!.gmd).filter((g): g is number => g !== null)),
  });
  const geral = resumoGrupo(ativos);

  const termo = busca.trim();
  const loteAberto = ver === 'lote' ? lotes.find((l) => String(l.id) === id) : undefined;
  const noInicio = !loteAberto && ver !== 'saidas' && ver !== 'pesagens';
  const temBrinco = (a: Animal) => a.brinco.includes(termo);
  // Na tela dos lotes a busca vale para o rebanho todo; dentro de uma lista, filtra só aquela lista.
  const doLote = loteAberto ? ativos.filter((a) => a.lote_id === loteAberto.id) : [];
  const lista = noInicio
    ? termo
      ? animais.filter(temBrinco)
      : []
    : loteAberto
      ? doLote.filter((a) => temBrinco(a) && (sexo === '' || a.sexo === sexo))
      : ver === 'saidas'
        ? saidos.filter((a) => temBrinco(a) && (tipoSaida === '' || a.saida_tipo === tipoSaida))
        : [];
  const listaPesagens = pesagens.filter((p) => brincoDe(p.animal_id).includes(termo));
  const pagLista = usePaginacao(lista, [termo, ver, id, sexo, tipoSaida]);
  const pagPesagens = usePaginacao(listaPesagens, termo);

  /** Brinco já usado por outro animal ativo (o banco tem a mesma regra). */
  const brincoEmUso = (brinco: string, ignorarId?: number) =>
    ativos.some((a) => a.brinco === brinco.trim() && a.id !== ignorarId) ? `Já existe um animal no rebanho com o brinco ${brinco.trim()}.` : null;

  /** "Nelore · Macho · Pasto da Sede · 352 kg" */
  const resumo = (a: Animal) =>
    [a.raca, a.sexo === 'M' ? 'Macho' : 'Fêmea', nomeLote(lotes, a.lote_id), textoPeso(evolucao.get(a.id)!.peso)].filter(Boolean).join(' · ');

  const linhaAnimal = (a: Animal, mostrarLote: boolean) => {
    const ev = evolucao.get(a.id)!;
    const detalhes = [mostrarLote && nomeLote(lotes, a.lote_id), a.saida_data ? `saiu em ${diaMes(a.saida_data)}` : ev.gmd !== null && `ganhando ${kgDia(ev.gmd)}`];
    return (
      <Linha
        key={a.id}
        marca={a.brinco}
        titulo={`${a.raca || 'Sem raça'} · ${a.sexo === 'M' ? 'Macho' : 'Fêmea'}`}
        subtitulo={detalhes.filter(Boolean).join(' · ') || undefined}
        valor={a.saida_valor ? reais(a.saida_valor) : textoPeso(ev.peso)}
        etiqueta={a.saida_tipo && <Etiqueta texto={SAIDA[a.saida_tipo]} tom={a.saida_tipo === 'morte' ? 'alerta' : 'neutro'} />}
        apagada={!!a.saida_data}
        onClick={() => setAberto({ tela: 'menu', animal: a })}
        dicaAcao="Ver o que dá para fazer com este animal"
      />
    );
  };

  return (
    <Tela>
      {/* ---------- Topo fixo: busca por brinco e cadastro ---------- */}
      <Topo busca={busca} onBusca={setBusca} numerico dica="Procurar brinco" novo="+ Animal" rotuloNovo="Cadastrar animal" onNovo={() => setAberto({ tela: 'novo', lote: loteAberto?.id })}>
        {numero(geral.cabecas)} cabeças em {numero(lotes.length)} {lotes.length === 1 ? 'lote' : 'lotes'}
        {geral.gmd !== null && ` · ganho médio ${kgDia(geral.gmd)}`}
      </Topo>

      {noInicio && termo ? (
        /* ---------- Resultado da busca ---------- */
        <Secao titulo={`Brincos com “${termo}” (${lista.length})`} descricao="Toque no animal para ver o que dá para fazer." rodape={pagLista.controles}>
          {lista.length === 0 && <Vazio>Nenhum animal com esse brinco.</Vazio>}
          {pagLista.itens.map((a) => linhaAnimal(a, true))}
        </Secao>
      ) : loteAberto ? (
        /* ---------- Dentro de um lote ---------- */
        <>
          <Trilha
            raiz="Rebanho"
            onVoltar={voltar}
            titulo={loteAberto.nome}
            descricao={loteAberto.descricao}
            acao={<Botao titulo="Ações do lote" secundario onClick={() => setAberto({ tela: 'acoesLote', lote: loteAberto })} />}
          />
          {(() => {
            const r = resumoGrupo(doLote);
            return (
              <Grade>
                <Cartao rotulo="Cabeças" valor={numero(r.cabecas)} />
                <Cartao rotulo="Peso médio" valor={r.peso === null ? '—' : textoPeso(r.peso)} />
                <Cartao rotulo="Ganho por dia" valor={r.gmd === null ? '—' : kgDia(r.gmd)} detalhe={r.gmd === null ? 'registre pesagens para ver' : 'média do lote'} />
              </Grade>
            );
          })()}
          <Secao
            titulo={`Animais (${lista.length})`}
            descricao="Toque em um animal para pesar, mudar de lote ou registrar a venda."
            acao={<Botao titulo="+ Animal neste lote" onClick={() => setAberto({ tela: 'novo', lote: loteAberto.id })} />}
            filtros={
              doLote.length > 0 && (
                <Opcoes
                  rotulo="Filtrar por sexo"
                  valor={sexo}
                  onMudar={setSexo}
                  opcoes={[
                    { valor: '', rotulo: 'Todos' },
                    { valor: 'M', rotulo: `Machos (${doLote.filter((a) => a.sexo === 'M').length})` },
                    { valor: 'F', rotulo: `Fêmeas (${doLote.filter((a) => a.sexo === 'F').length})` },
                  ]}
                />
              )
            }
            rodape={pagLista.controles}>
            {lista.length === 0 && (
              <Vazio>{doLote.length === 0 ? 'Nenhum animal neste lote. Toque em “+ Animal neste lote” ou mude animais de outro lote para cá.' : 'Nenhum animal com esse filtro.'}</Vazio>
            )}
            {pagLista.itens.map((a) => linhaAnimal(a, false))}
          </Secao>
        </>
      ) : ver === 'saidas' ? (
        /* ---------- Vendidos, abatidos e mortos ---------- */
        <>
          <Trilha raiz="Rebanho" onVoltar={voltar} aqui="Animais que saíram" />
          <Secao
            titulo={`Animais que saíram (${lista.length})`}
            descricao="Vendidos, abatidos e mortos. Toque para desfazer uma saída lançada por engano."
            filtros={
              saidos.length > 0 && (
                <Opcoes
                  rotulo="Filtrar por tipo de saída"
                  valor={tipoSaida}
                  onMudar={setTipoSaida}
                  opcoes={[
                    { valor: '', rotulo: 'Todos' },
                    { valor: 'venda', rotulo: 'Vendidos' },
                    { valor: 'abate', rotulo: 'Abatidos' },
                    { valor: 'morte', rotulo: 'Morreram' },
                  ]}
                />
              )
            }
            rodape={pagLista.controles}>
            {lista.length === 0 && <Vazio>{saidos.length === 0 ? 'Nenhum animal saiu do rebanho ainda.' : 'Nenhum animal com esse filtro.'}</Vazio>}
            {pagLista.itens.map((a) => linhaAnimal(a, true))}
          </Secao>
        </>
      ) : ver === 'pesagens' ? (
        /* ---------- Histórico de pesagens ---------- */
        <>
          <Trilha raiz="Rebanho" onVoltar={voltar} aqui="Pesagens" />
          <Secao titulo={`Pesagens (${listaPesagens.length})`} descricao="Para pesar, toque no animal. Aqui você corrige ou apaga uma pesagem. Use a busca no topo para ver as de um brinco." rodape={pagPesagens.controles}>
            {listaPesagens.length === 0 && (
              <Vazio>{pesagens.length === 0 ? 'Nenhuma pesagem ainda. Toque em um animal e escolha “Registrar pesagem”.' : 'Nenhuma pesagem desse brinco.'}</Vazio>
            )}
            {pagPesagens.itens.map((p) => (
              <Linha
                key={p.id}
                marca={diaMes(p.data)}
                titulo={`Brinco ${brincoDe(p.animal_id)}`}
                valor={textoPeso(p.peso)}
                onClick={() => setAberto({ tela: 'pesagem', pesagem: p })}
                dicaAcao="Corrigir ou apagar esta pesagem"
              />
            ))}
          </Secao>
        </>
      ) : (
        /* ---------- Início: um cartão por lote ---------- */
        <>
          <Grupos
            titulo="Lotes"
            vazio={lotes.length === 0 && 'Comece criando um lote (um pasto, o confinamento…). Todo animal fica em um lote.'}
            novo="+ Novo lote"
            onNovo={() => setAberto({ tela: 'lote' })}>
            {lotes.map((l) => {
              const r = resumoGrupo(ativos.filter((a) => a.lote_id === l.id));
              return (
                <CartaoGrupo
                  key={l.id}
                  titulo={l.nome}
                  valor={numero(r.cabecas)}
                  unidade={r.cabecas === 1 ? 'cabeça' : 'cabeças'}
                  detalhes={[r.peso === null ? 'Sem animais' : textoPeso(r.peso), r.gmd !== null && `+${kgDia(r.gmd)}`]}
                  onClick={() => abrir('lote', l.id)}
                />
              );
            })}
          </Grupos>

          <Secao titulo="Mais">
            <Linha
              titulo="Animais que saíram"
              subtitulo="Vendidos, abatidos e mortos"
              valor={numero(saidos.length)}
              onClick={() => abrir('saidas')}
              dicaAcao="Ver os animais que saíram do rebanho"
            />
            <Linha
              titulo="Entrada de compra (vários animais)"
              subtitulo="Cadastrar de uma vez os animais de uma compra"
              onClick={() => setAberto({ tela: 'compraVarios' })}
              dicaAcao="Cadastrar vários animais de uma compra"
            />
            <Linha
              titulo="Pesagens"
              subtitulo="Corrigir ou apagar uma pesagem"
              valor={numero(pesagens.length)}
              onClick={() => abrir('pesagens')}
              dicaAcao="Ver todas as pesagens"
            />
          </Secao>
        </>
      )}

      {/* ---------- Menu do animal: uma lista de botões, cada um dizendo o que faz ---------- */}
      {aberto?.tela === 'menu' && (
        <MenuAcoes
          titulo={`Brinco ${aberto.animal.brinco}`}
          descricao={
            aberto.animal.saida_data
              ? `${SAIDA[aberto.animal.saida_tipo!]} em ${diaMes(aberto.animal.saida_data)} · ${resumo(aberto.animal)}`
              : resumo(aberto.animal)
          }
          onFechar={fechar}
          acoes={
            aberto.animal.saida_data
              ? [
                  verCertidao(aberto.animal),
                  { titulo: 'Desfazer a saída', descricao: 'Foi registrada por engano: o animal volta para o rebanho.', onClick: () => setAberto({ tela: 'desfazer', animal: aberto.animal }) },
                  { titulo: 'Corrigir o cadastro', descricao: 'Mudar brinco, raça, sexo, data ou peso de entrada.', onClick: () => setAberto({ tela: 'corrigir', animal: aberto.animal }) },
                  { titulo: 'Excluir animal', descricao: 'Apaga o animal e todo o histórico dele.', perigo: true, onClick: () => setAberto({ tela: 'excluir', animal: aberto.animal }) },
                ]
              : [
                  verCertidao(aberto.animal),
                  { titulo: 'Registrar pesagem', descricao: 'Anotar quanto o animal pesa hoje.', onClick: () => setAberto({ tela: 'pesar', animal: aberto.animal }) },
                  { titulo: 'Mudar de lote', descricao: 'Levar o animal para outro pasto ou para o confinamento.', onClick: () => setAberto({ tela: 'mover', animal: aberto.animal }) },
                  { titulo: 'Registrar venda, abate ou morte', descricao: 'O animal sai do rebanho, mas o histórico fica guardado.', onClick: () => setAberto({ tela: 'saida', animal: aberto.animal }) },
                  { titulo: 'Corrigir o cadastro', descricao: 'Mudar brinco, raça, sexo, data ou peso de entrada.', onClick: () => setAberto({ tela: 'corrigir', animal: aberto.animal }) },
                  { titulo: 'Excluir animal', descricao: 'Só se foi cadastrado por engano. Apaga todo o histórico.', perigo: true, onClick: () => setAberto({ tela: 'excluir', animal: aberto.animal }) },
                ]
          }
        />
      )}

      {aberto?.tela === 'pesar' && (
        <Formulario
          titulo={`Pesagem do brinco ${aberto.animal.brinco}`}
          descricao={`Último peso: ${textoPeso(evolucao.get(aberto.animal.id)!.peso)}, em ${diaMes(evolucao.get(aberto.animal.id)!.data)}.`}
          campos={[
            { chave: 'data', rotulo: 'Data da pesagem', tipo: 'data' },
            { chave: 'peso', rotulo: 'Peso', tipo: 'peso', dica: 'Ex.: 380', ajuda: 'Escolha ao lado se está digitando em quilos (kg) ou arrobas (@).' },
          ]}
          validar={(v) => (v.data < aberto.animal.entrada_data ? `A data não pode ser antes da chegada do animal (${diaMes(aberto.animal.entrada_data)}).` : null)}
          onSalvar={(v) => salvar('pesagens', { animal_id: aberto.animal.id, data: v.data, peso: num(v.peso) })}
          salvarTexto="Salvar pesagem"
          sucesso="Pesagem registrada."
          onFechar={fechar}
        />
      )}

      {aberto?.tela === 'mover' && (
        <Formulario
          titulo={`Mudar o brinco ${aberto.animal.brinco} de lote`}
          descricao={`Hoje ele está em: ${nomeLote(lotes, aberto.animal.lote_id)}.`}
          campos={[
            {
              chave: 'lote',
              rotulo: 'Para qual lote vai',
              tipo: 'opcoes',
              opcoes: opcoesLote.filter((o) => o.valor !== String(aberto.animal.lote_id)),
              novo: { rotulo: '+ Novo lote', dica: 'Ex.: Pasto do Fundo', criar: criarLote },
            },
          ]}
          validar={(v) => (v.lote && v.lote !== String(aberto.animal.lote_id) ? null : 'Escolha outro lote ou crie um em “+ Novo lote”.')}
          onSalvar={(v) => salvar('animais', { id: aberto.animal.id, lote_id: Number(v.lote) })}
          salvarTexto="Mudar de lote"
          sucesso="Animal mudou de lote."
          onFechar={fechar}
        />
      )}

      {aberto?.tela === 'saida' && (
        <Formulario
          titulo={`Saída do brinco ${aberto.animal.brinco}`}
          descricao="O animal sai da lista do rebanho. Dá para desfazer depois, se for engano."
          campos={[
            {
              chave: 'tipo',
              rotulo: 'O que aconteceu',
              tipo: 'opcoes',
              opcoes: [
                { valor: 'venda', rotulo: 'Foi vendido' },
                { valor: 'abate', rotulo: 'Foi abatido' },
                { valor: 'morte', rotulo: 'Morreu' },
              ],
            },
            { chave: 'data', rotulo: 'Quando', tipo: 'data' },
            { chave: 'valor', rotulo: 'Valor recebido (R$)', tipo: 'numero', dica: 'Ex.: 6200', quando: (v) => v.tipo === 'venda', ajuda: 'O total que recebeu pelo animal.' },
            { chave: 'valor', rotulo: 'Valor (R$)', tipo: 'numero', opcional: true, quando: (v) => v.tipo === 'abate' },
            { chave: 'peso', rotulo: 'Peso na saída', tipo: 'peso', opcional: true, quando: (v) => v.tipo !== 'morte' },
            { ...CAMPO_GTA_SAIDA, quando: (v) => v.tipo !== 'morte' },
          ]}
          validar={(v) => (v.data < aberto.animal.entrada_data ? `A data não pode ser antes da chegada do animal (${diaMes(aberto.animal.entrada_data)}).` : null)}
          onSalvar={(v) =>
            salvar('animais', {
              id: aberto.animal.id,
              saida_tipo: v.tipo as 'venda' | 'morte' | 'abate',
              saida_data: v.data,
              saida_peso: v.tipo !== 'morte' && v.peso.trim() ? num(v.peso) : null,
              saida_valor: v.tipo !== 'morte' && v.valor.trim() ? num(v.valor) : null,
              saida_gta: v.tipo !== 'morte' ? gta(v.gta) : null,
            })
          }
          salvarTexto="Registrar saída"
          sucesso="Saída registrada."
          onFechar={fechar}
        />
      )}

      {aberto?.tela === 'corrigir' && (
        <Formulario
          titulo={`Corrigir o cadastro do brinco ${aberto.animal.brinco}`}
          campos={CAMPOS_CADASTRO}
          iniciais={{
            brinco: aberto.animal.brinco,
            sexo: aberto.animal.sexo,
            raca: aberto.animal.raca,
            e_tipo: aberto.animal.entrada_tipo,
            e_data: aberto.animal.entrada_data,
            e_peso: numParaTexto(aberto.animal.entrada_peso),
            e_valor: aberto.animal.entrada_valor ? numParaTexto(aberto.animal.entrada_valor) : '',
            nasc: aberto.animal.nascimento ?? '',
            e_gta: aberto.animal.entrada_gta ?? '',
          }}
          validar={(v) => {
            if (aberto.animal.saida_data && v.e_data > aberto.animal.saida_data) return `A chegada não pode ser depois da saída (${diaMes(aberto.animal.saida_data)}).`;
            if (nascimentoInvalido(v)) return nascimentoInvalido(v);
            // Animal que já saiu não disputa brinco com os que estão no rebanho.
            return aberto.animal.saida_data ? null : brincoEmUso(v.brinco, aberto.animal.id);
          }}
          onSalvar={(v) => salvar('animais', { id: aberto.animal.id, ...cadastro(v) })}
          salvarTexto="Salvar correção"
          sucesso="Cadastro corrigido."
          onFechar={fechar}
        />
      )}

      {aberto?.tela === 'desfazer' && (
        <Confirmacao
          titulo="Desfazer a saída?"
          texto={`O brinco ${aberto.animal.brinco} volta para a lista do rebanho, como se não tivesse saído.`}
          confirmar="Sim, desfazer"
          perigo={false}
          sucesso="Saída desfeita."
          onConfirmar={() =>
            brincoEmUso(aberto.animal.brinco, aberto.animal.id) ??
            salvar('animais', { id: aberto.animal.id, saida_data: null, saida_tipo: null, saida_peso: null, saida_valor: null, saida_gta: null })
          }
          onFechar={fechar}
        />
      )}

      {aberto?.tela === 'excluir' && (
        <Confirmacao
          titulo={`Excluir o brinco ${aberto.animal.brinco}?`}
          texto="O animal e todas as pesagens e vacinas dele serão apagados de vez. Se ele foi vendido ou morreu, use “Registrar venda, abate ou morte” em vez de excluir: assim o histórico fica guardado."
          confirmar="Excluir de vez"
          sucesso="Animal excluído."
          onConfirmar={() => excluir('animais', aberto.animal.id)}
          onFechar={fechar}
        />
      )}

      {aberto?.tela === 'novo' && (
        <Formulario
          titulo="Cadastrar animal"
          campos={[...CAMPOS_CADASTRO.slice(0, 3), { chave: 'lote', rotulo: 'Em qual lote vai ficar', tipo: 'opcoes', opcoes: opcoesLote, ajuda: 'Se o lote ainda não existe, toque em “+ Novo lote”.', novo: { rotulo: '+ Novo lote', dica: 'Ex.: Pasto do Fundo', criar: criarLote } }, ...CAMPOS_CADASTRO.slice(3)]}
          iniciais={aberto.lote ? { lote: String(aberto.lote) } : null}
          validar={(v) => (v.lote ? (nascimentoInvalido(v) ?? brincoEmUso(v.brinco)) : 'Escolha o lote ou crie um em “+ Novo lote”.')}
          onSalvar={(v) => salvar('animais', { ...cadastro(v), lote_id: Number(v.lote), saida_data: null, saida_tipo: null, saida_valor: null })}
          salvarTexto="Cadastrar animal"
          sucesso="Animal cadastrado."
          onFechar={fechar}
        />
      )}

      {aberto?.tela === 'lote' && (
        <Formulario
          titulo={aberto.lote ? `Lote ${aberto.lote.nome}` : 'Novo lote'}
          campos={[
            { chave: 'nome', rotulo: 'Nome do lote', dica: 'Ex.: Pasto do Fundo' },
            { chave: 'descricao', rotulo: 'Observação', opcional: true, dica: 'Ex.: 12 hectares, braquiária' },
          ]}
          iniciais={aberto.lote && { nome: aberto.lote.nome, descricao: aberto.lote.descricao ?? '' }}
          validar={(v) =>
            lotes.some((l) => l.nome.toLowerCase() === v.nome.trim().toLowerCase() && l.id !== aberto.lote?.id) ? 'Já existe um lote com esse nome.' : null
          }
          onSalvar={(v) => salvar('lotes', { ...(aberto.lote && { id: aberto.lote.id }), nome: v.nome.trim(), descricao: v.descricao.trim() || null })}
          salvarTexto={aberto.lote ? 'Salvar alterações' : 'Criar lote'}
          sucesso={aberto.lote ? 'Lote atualizado.' : 'Lote criado.'}
          onExcluir={
            aberto.lote &&
            (() => {
              const { id } = aberto.lote!;
              if (loteEmUso(id)) return 'Não dá para excluir: este lote tem animais ou tratos. Mude os animais de lote antes.';
              voltar();
              return excluir('lotes', id);
            })
          }
          excluirTexto="Excluir lote"
          onFechar={fechar}
        />
      )}

      {aberto?.tela === 'pesagem' && (
        <Formulario
          titulo={`Pesagem do brinco ${brincoDe(aberto.pesagem.animal_id)}`}
          campos={[
            { chave: 'data', rotulo: 'Data da pesagem', tipo: 'data' },
            { chave: 'peso', rotulo: 'Peso', tipo: 'peso' },
          ]}
          iniciais={{ data: aberto.pesagem.data, peso: numParaTexto(aberto.pesagem.peso) }}
          validar={(v) => {
            const animal = animais.find((a) => a.id === aberto.pesagem.animal_id);
            return animal && v.data < animal.entrada_data ? `A data não pode ser antes da chegada do animal (${diaMes(animal.entrada_data)}).` : null;
          }}
          onSalvar={(v) => salvar('pesagens', { id: aberto.pesagem.id, data: v.data, peso: num(v.peso) })}
          salvarTexto="Salvar correção"
          sucesso="Pesagem corrigida."
          onExcluir={() => excluir('pesagens', aberto.pesagem.id)}
          excluirTexto="Apagar pesagem"
          onFechar={fechar}
        />
      )}

      {/* ---------- Ações com o lote inteiro ---------- */}
      {aberto?.tela === 'acoesLote' && (
        <MenuAcoes
          titulo={`Lote ${aberto.lote.nome}`}
          descricao={`${numero(animaisDo(aberto.lote).length)} cabeças`}
          onFechar={fechar}
          acoes={[
            ...(animaisDo(aberto.lote).length > 0
              ? [
                  { titulo: 'Pesar o lote', descricao: 'Anotar o peso de cada animal que passou na balança, numa tela só.', onClick: () => setAberto({ tela: 'pesarLote', lote: aberto.lote }) },
                  { titulo: 'Mudar vários de lote', descricao: 'Marcar os animais e levar todos para outro pasto.', onClick: () => setAberto({ tela: 'moverVarios', lote: aberto.lote }) },
                  { titulo: 'Vender ou abater vários', descricao: 'Lançar a saída de vários animais com o valor total da venda.', onClick: () => setAberto({ tela: 'venderVarios', lote: aberto.lote }) },
                  { titulo: 'Resumo para o GTA', descricao: 'Machos e fêmeas por faixa de idade, os números que o e-GTA pede.', onClick: () => setAberto({ tela: 'gta', lote: aberto.lote }) },
                  // Só os comprados: nos nascidos na fazenda o nascimento é a data de entrada.
                  ...(animaisDo(aberto.lote).some((a) => a.entrada_tipo === 'compra')
                    ? [{ titulo: 'Informar nascimento de vários', descricao: 'Mesma data de nascimento (aproximada) para os animais comprados marcados.', onClick: () => setAberto({ tela: 'nascVarios', lote: aberto.lote }) }]
                    : []),
                ]
              : []),
            { titulo: 'Entrada de compra (vários animais)', descricao: 'Cadastrar de uma vez os animais de uma compra neste lote.', onClick: () => setAberto({ tela: 'compraVarios', lote: aberto.lote.id }) },
            { titulo: 'Editar lote', descricao: 'Mudar o nome ou a observação, ou excluir o lote.', onClick: () => setAberto({ tela: 'lote', lote: aberto.lote }) },
          ]}
        />
      )}

      {aberto?.tela === 'pesarLote' &&
        (() => {
          const grupo = animaisDo(aberto.lote);
          const pesados = (v: Valores) => grupo.filter((a) => v[`p${a.id}`].trim());
          return (
            <Formulario
              titulo={`Pesar o lote ${aberto.lote.nome}`}
              descricao="Digite o peso de cada animal que passou na balança. Os que ficarem em branco não são gravados."
              campos={[
                { chave: 'data', rotulo: 'Data da pesagem', tipo: 'data' },
                ...grupo.map((a): Campo => {
                  const ev = evolucao.get(a.id)!;
                  return { chave: `p${a.id}`, rotulo: `Brinco ${a.brinco}`, tipo: 'peso', opcional: true, ajuda: `Último: ${textoPeso(ev.peso)} em ${diaMes(ev.data)}` };
                }),
              ]}
              validar={(v) => {
                const lista = pesados(v);
                if (lista.length === 0) return 'Digite o peso de pelo menos um animal.';
                const antes = lista.find((a) => v.data < a.entrada_data);
                return antes ? `O brinco ${antes.brinco} chegou em ${diaMes(antes.entrada_data)}, depois da data da pesagem.` : null;
              }}
              onSalvar={(v) => salvarVarios('pesagens', pesados(v).map((a) => ({ animal_id: a.id, data: v.data, peso: num(v[`p${a.id}`]) })))}
              salvarTexto="Salvar pesagens"
              sucesso="Pesagens registradas."
              onFechar={fechar}
            />
          );
        })()}

      {aberto?.tela === 'moverVarios' && (
        <Formulario
          titulo={`Mudar animais de ${aberto.lote.nome}`}
          descricao="Marque os animais e escolha para onde vão."
          campos={[
            { chave: 'animais', rotulo: 'Quais animais', tipo: 'varios', opcoes: opcoesBrinco(animaisDo(aberto.lote)) },
            {
              chave: 'lote',
              rotulo: 'Para qual lote vão',
              tipo: 'opcoes',
              opcoes: opcoesLote.filter((o) => o.valor !== String(aberto.lote.id)),
              novo: { rotulo: '+ Novo lote', dica: 'Ex.: Pasto do Fundo', criar: criarLote },
            },
          ]}
          validar={(v) => (v.lote && v.lote !== String(aberto.lote.id) ? null : 'Escolha outro lote ou crie um em “+ Novo lote”.')}
          onSalvar={(v) => salvarVarios('animais', marcados(v.animais).map((id) => ({ id: Number(id), lote_id: Number(v.lote) })))}
          salvarTexto="Mudar de lote"
          sucesso="Animais mudaram de lote."
          onFechar={fechar}
        />
      )}

      {aberto?.tela === 'venderVarios' &&
        (() => {
          const grupo = animaisDo(aberto.lote);
          const escolhidos = (v: Valores) => grupo.filter((a) => marcados(v.animais).includes(String(a.id)));
          return (
            <Formulario
              titulo={`Saída de animais de ${aberto.lote.nome}`}
              descricao="O valor e o peso total são divididos entre os animais pelo peso atual de cada um (última pesagem). Uma saída por engano se desfaz em “Animais que saíram”."
              campos={[
                { chave: 'animais', rotulo: 'Quais animais', tipo: 'varios', opcoes: opcoesBrinco(grupo) },
                {
                  chave: 'tipo',
                  rotulo: 'O que aconteceu',
                  tipo: 'opcoes',
                  opcoes: [
                    { valor: 'venda', rotulo: 'Foram vendidos' },
                    { valor: 'abate', rotulo: 'Foram abatidos' },
                  ],
                },
                { chave: 'data', rotulo: 'Quando', tipo: 'data' },
                { chave: 'valor', rotulo: 'Valor total recebido (R$)', tipo: 'numero', dica: 'Ex.: 62000', ajuda: 'O total de todos os animais marcados.', quando: (v) => v.tipo === 'venda' },
                { chave: 'valor', rotulo: 'Valor total (R$)', tipo: 'numero', opcional: true, quando: (v) => v.tipo === 'abate' },
                { chave: 'peso', rotulo: 'Peso total na saída', tipo: 'peso', opcional: true, ajuda: 'Todos juntos (ex.: a balança do caminhão).' },
                CAMPO_GTA_SAIDA,
              ]}
              validar={(v) => {
                const antes = escolhidos(v).find((a) => v.data < a.entrada_data);
                return antes ? `O brinco ${antes.brinco} chegou em ${diaMes(antes.entrada_data)}, depois da data da saída.` : null;
              }}
              onSalvar={(v) => {
                const lista = escolhidos(v);
                const pesos = lista.map((a) => evolucao.get(a.id)!.peso);
                const valores = v.valor.trim() ? ratear(num(v.valor), pesos) : null;
                const pesosSaida = v.peso.trim() ? ratear(num(v.peso), pesos) : null;
                return salvarVarios(
                  'animais',
                  lista.map((a, i) => ({
                    id: a.id,
                    saida_tipo: v.tipo as 'venda' | 'abate',
                    saida_data: v.data,
                    saida_valor: valores?.[i] ?? null,
                    saida_peso: pesosSaida?.[i] ?? null,
                    saida_gta: gta(v.gta),
                  })),
                );
              }}
              salvarTexto="Registrar saída"
              sucesso="Saída registrada."
              onFechar={fechar}
            />
          );
        })()}

      {aberto?.tela === 'compraVarios' && (
        <Formulario
          titulo="Entrada de compra (vários animais)"
          descricao="Cadastra de uma vez os animais de uma mesma compra. Depois dá para corrigir cada um."
          campos={[
            { chave: 'primeiro', rotulo: 'Brinco do primeiro animal', dica: 'Ex.: 0201', ajuda: 'Só números. Os outros seguem a sequência: 0201, 0202, 0203…' },
            { chave: 'quantidade', rotulo: 'Quantos animais', tipo: 'numero', dica: 'Ex.: 40' },
            CAMPOS_CADASTRO[1],
            CAMPOS_CADASTRO[2],
            { chave: 'lote', rotulo: 'Em qual lote vão ficar', tipo: 'opcoes', opcoes: opcoesLote, novo: { rotulo: '+ Novo lote', dica: 'Ex.: Pasto do Fundo', criar: criarLote } },
            { chave: 'e_data', rotulo: 'Data da compra', tipo: 'data' },
            { chave: 'e_peso', rotulo: 'Peso médio por cabeça', tipo: 'peso', dica: 'Ex.: 210', ajuda: 'O peso total da balança dividido pelo número de animais.' },
            { chave: 'e_valor', rotulo: 'Valor total pago (R$)', tipo: 'numero', opcional: true, dica: 'Ex.: 128000', ajuda: 'O total da compra. É dividido igualmente entre os animais.' },
            { chave: 'nasc', rotulo: 'Data de nascimento aproximada', tipo: 'data', opcional: true, ajuda: 'A mesma para todos. Serve para mostrar a idade.' },
            { chave: 'e_gta', rotulo: 'Número da GTA', opcional: true, dica: 'Ex.: 123456', ajuda: 'A guia que veio com os animais.' },
          ]}
          iniciais={aberto.lote ? { lote: String(aberto.lote) } : null}
          validar={(v) => {
            const n = num(v.quantidade);
            if (!Number.isInteger(n) || n > 500) return 'A quantidade precisa ser um número inteiro, de 1 a 500.';
            const brincos = faixaBrincos(v.primeiro, n);
            if (!brincos) return 'O brinco do primeiro animal precisa ser só números, para numerar os outros em sequência.';
            if (!v.lote) return 'Escolha o lote ou crie um em “+ Novo lote”.';
            if (v.nasc && v.nasc > v.e_data) return 'O nascimento não pode ser depois da compra.';
            const emUso = brincos.filter((b) => ativos.some((a) => a.brinco === b));
            return emUso.length
              ? `Já existem no rebanho os brincos ${emUso.slice(0, 5).join(', ')}${emUso.length > 5 ? ` e mais ${emUso.length - 5}` : ''}. Comece de outro número.`
              : null;
          }}
          onSalvar={(v) => {
            const brincos = faixaBrincos(v.primeiro, num(v.quantidade))!;
            const valores = v.e_valor.trim() ? ratear(num(v.e_valor), brincos.map(() => 1)) : null;
            return salvarVarios(
              'animais',
              brincos.map((brinco, i) => ({
                brinco,
                sexo: v.sexo as 'M' | 'F',
                raca: v.raca.trim(),
                lote_id: Number(v.lote),
                entrada_tipo: 'compra' as const,
                entrada_data: v.e_data,
                entrada_peso: num(v.e_peso),
                entrada_valor: valores?.[i] ?? null,
                nascimento: v.nasc || null,
                entrada_gta: gta(v.e_gta),
                saida_data: null,
                saida_tipo: null,
                saida_valor: null,
              })),
            );
          }}
          salvarTexto="Cadastrar animais"
          sucesso="Animais cadastrados."
          onFechar={fechar}
        />
      )}

      {aberto?.tela === 'gta' && (
        <ResumoGta lote={aberto.lote} grupo={animaisDo(aberto.lote)} onFechar={fechar} onNascimento={() => setAberto({ tela: 'nascVarios', lote: aberto.lote })} />
      )}

      {aberto?.tela === 'nascVarios' &&
        (() => {
          const comprados = animaisDo(aberto.lote).filter((a) => a.entrada_tipo === 'compra');
          const escolhidos = (v: Valores) => comprados.filter((a) => marcados(v.animais).includes(String(a.id)));
          return (
            <Formulario
              titulo={`Nascimento de animais de ${aberto.lote.nome}`}
              descricao="Para animais de uma mesma compra, com mais ou menos a mesma idade. Serve para a idade na certidão e para o resumo do GTA."
              campos={[
                { chave: 'animais', rotulo: 'Quais animais', tipo: 'varios', opcoes: opcoesBrinco(comprados), ajuda: 'Já vêm marcados os que ainda não têm nascimento.' },
                { chave: 'data', rotulo: 'Data de nascimento (aproximada)', tipo: 'data' },
              ]}
              iniciais={{ animais: comprados.filter((a) => !a.nascimento).map((a) => String(a.id)).join(',') }}
              validar={(v) => {
                const antes = escolhidos(v).find((a) => v.data > a.entrada_data);
                return antes ? `O brinco ${antes.brinco} chegou em ${dataCurta(antes.entrada_data)}, antes dessa data de nascimento.` : null;
              }}
              onSalvar={(v) => salvarVarios('animais', escolhidos(v).map((a) => ({ id: a.id, nascimento: v.data })))}
              salvarTexto="Salvar nascimento"
              sucesso="Nascimento informado."
              onFechar={fechar}
            />
          );
        })()}
    </Tela>
  );
}

/** "Resumo para o GTA": marca os animais que vão no caminhão e mostra machos e fêmeas por faixa de idade. */
function ResumoGta({ lote, grupo, onFechar, onNascimento }: { lote: Lote; grupo: Animal[]; onFechar: () => void; onNascimento: () => void }) {
  const [valor, setValor] = useState(() => grupo.map((a) => String(a.id)).join(','));
  const lista = marcados(valor);
  const { faixas, semIdade } = resumoGta(
    grupo.filter((a) => lista.includes(String(a.id))),
    hojeIso(),
  );
  const semIdadeTotal = semIdade.machos + semIdade.femeas;
  const linhas = semIdadeTotal > 0 ? [...faixas, { rotulo: 'Idade não informada', ...semIdade }] : faixas;
  const soma = (k: 'machos' | 'femeas') => linhas.reduce((s, l) => s + l[k], 0);
  const celula = 'py-1.5 pl-3 text-right';
  return (
    <Janela titulo={`Resumo para o GTA · ${lote.nome}`} descricao="Os números que o e-GTA pede. Deixe marcados só os animais que vão no caminhão." onFechar={onFechar}>
      <div className="flex flex-col gap-1.5">
        <h3 id="gta-animais" className="text-sm font-bold">
          Animais
        </h3>
        <Varios opcoes={grupo.map((a) => ({ valor: String(a.id), rotulo: a.brinco }))} valor={valor} rotuloId="gta-animais" onMudar={setValor} />
      </div>
      <table className="w-full text-left tabular-nums">
        <thead>
          <tr className="text-sm text-texto-2">
            <th className="py-1.5 font-semibold">Idade</th>
            <th className={`${celula} font-semibold`}>Machos</th>
            <th className={`${celula} font-semibold`}>Fêmeas</th>
            <th className={`${celula} font-semibold`}>Total</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.rotulo} className="border-t border-borda">
              <td className="py-1.5 font-medium">{l.rotulo}</td>
              <td className={celula}>{l.machos}</td>
              <td className={celula}>{l.femeas}</td>
              <td className={`${celula} font-bold`}>{l.machos + l.femeas}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-borda font-bold">
            <td className="py-1.5">Total</td>
            <td className={celula}>{soma('machos')}</td>
            <td className={celula}>{soma('femeas')}</td>
            <td className={celula}>{soma('machos') + soma('femeas')}</td>
          </tr>
        </tfoot>
      </table>
      {semIdadeTotal > 0 && (
        <div className="flex flex-col items-start gap-2 rounded-xl bg-alerta-suave p-3 text-sm font-semibold text-alerta">
          <p>
            {semIdadeTotal} {semIdadeTotal === 1 ? 'animal está' : 'animais estão'} sem data de nascimento, e o e-GTA pede a faixa de idade de cada um.
          </p>
          <Botao titulo="Informar nascimento" secundario onClick={onNascimento} />
        </div>
      )}
      <p className="text-sm font-medium text-texto-2">Confira se as faixas são as mesmas do formulário do e-SANIAGRO (Iagro).</p>
    </Janela>
  );
}
