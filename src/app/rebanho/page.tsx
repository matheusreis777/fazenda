'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { type Campo, Formulario, type Valores } from '@/components/formulario';
import { Botao, Cartao, CartaoGrupo, Confirmacao, Etiqueta, Grade, Grupos, Linha, MenuAcoes, Opcoes, Secao, Tela, Topo, Trilha, usePaginacao, useVista, Vazio } from '@/components/ui';
import { type Animal, criarLote, diaMes, evolucaoPeso, excluir, type Lote, loteEmUso, nomeLote, numero, type Pesagem, reais, salvar, useDados } from '@/lib/dados';
import { num, numParaTexto, textoPeso } from '@/lib/formato';

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

/** O que está aberto na tela: o menu do animal, um dos formulários dele, ou nada. */
type Aberto =
  | { tela: 'menu' | 'pesar' | 'mover' | 'saida' | 'corrigir' | 'desfazer' | 'excluir'; animal: Animal }
  | { tela: 'novo'; lote?: number }
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
            acao={<Botao titulo="Editar lote" secundario onClick={() => setAberto({ tela: 'lote', lote: loteAberto })} />}
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
          ]}
          validar={(v) => (v.data < aberto.animal.entrada_data ? `A data não pode ser antes da chegada do animal (${diaMes(aberto.animal.entrada_data)}).` : null)}
          onSalvar={(v) =>
            salvar('animais', {
              id: aberto.animal.id,
              saida_tipo: v.tipo as 'venda' | 'morte' | 'abate',
              saida_data: v.data,
              saida_peso: v.tipo !== 'morte' && v.peso.trim() ? num(v.peso) : null,
              saida_valor: v.tipo !== 'morte' && v.valor.trim() ? num(v.valor) : null,
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
          }}
          validar={(v) => {
            if (aberto.animal.saida_data && v.e_data > aberto.animal.saida_data) return `A chegada não pode ser depois da saída (${diaMes(aberto.animal.saida_data)}).`;
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
            salvar('animais', { id: aberto.animal.id, saida_data: null, saida_tipo: null, saida_peso: null, saida_valor: null })
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
          validar={(v) => (v.lote ? brincoEmUso(v.brinco) : 'Escolha o lote ou crie um em “+ Novo lote”.')}
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
    </Tela>
  );
}
