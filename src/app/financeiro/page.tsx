'use client';

import { useState } from 'react';

import { type Campo, Formulario, type Valores } from '@/components/formulario';
import { Botao, Cartao, CartaoGrupo, contem, Etiqueta, Grade, Grupos, Linha, Opcoes, Secao, Tela, Topo, usePaginacao, Vazio, Voltar } from '@/components/ui';
import { CATEGORIAS, type Categoria, type Despesa, diaMes, excluir, mesIso, nomeMes, numero, numeroCurto, reais, type Recorrente, salvar, useDados } from '@/lib/dados';
import { num, numParaTexto } from '@/lib/formato';

const OPCOES_CATEGORIA = (Object.keys(CATEGORIAS) as Categoria[]).map((c) => ({ valor: c, rotulo: CATEGORIAS[c] }));

/** O que a tela mostra: os cartões das categorias, os gastos de uma categoria ou os gastos fixos. */
type Vista = { tipo: 'inicio' } | { tipo: 'categoria'; categoria: Categoria } | { tipo: 'fixos' };

export default function Financeiro() {
  const { despesas, recorrentes, estoque, funcionarios, maquinas } = useDados();

  // Funcionário (categoria Funcionários) e máquina (categoria Maquinário) ligados ao gasto. Só os ativos,
  // mais o que já estiver ligado ao registro em edição.
  const camposVinculo = (atual?: { funcionario_id?: number | null; maquina_id?: number | null }): Campo[] => [
    {
      chave: 'funcionario',
      rotulo: 'De qual funcionário',
      tipo: 'opcoes',
      opcional: true,
      ajuda: 'Para saber quanto cada funcionário custa (aparece em Equipe e em Relatórios).',
      opcoes: [
        { valor: '', rotulo: 'Nenhum' },
        ...funcionarios.filter((f) => f.ativo || f.id === atual?.funcionario_id).map((f) => ({ valor: String(f.id), rotulo: f.nome })),
      ],
      quando: (v) => v.categoria === 'funcionarios',
    },
    {
      chave: 'maquina',
      rotulo: 'De qual máquina',
      tipo: 'opcoes',
      opcional: true,
      ajuda: 'Para saber quanto cada máquina custa (aparece em Equipe e em Relatórios).',
      opcoes: [
        { valor: '', rotulo: 'Nenhuma' },
        ...maquinas.filter((m) => m.ativo || m.id === atual?.maquina_id).map((m) => ({ valor: String(m.id), rotulo: m.nome })),
      ],
      quando: (v) => v.categoria === 'maquinario',
    },
  ];
  const vinculoInicial = (atual: { funcionario_id?: number | null; maquina_id?: number | null }) => ({
    funcionario: atual.funcionario_id ? String(atual.funcionario_id) : '',
    maquina: atual.maquina_id ? String(atual.maquina_id) : '',
  });
  // Escolha feita antes de trocar de categoria fica guardada no formulário; só vale na categoria certa.
  const vinculo = (v: Valores) => ({
    funcionario_id: v.categoria === 'funcionarios' && v.funcionario ? Number(v.funcionario) : null,
    maquina_id: v.categoria === 'maquinario' && v.maquina ? Number(v.maquina) : null,
  });
  const nomeVinculo = (d: { funcionario_id?: number | null; maquina_id?: number | null }) =>
    funcionarios.find((f) => f.id === d.funcionario_id)?.nome ?? maquinas.find((m) => m.id === d.maquina_id)?.nome;
  // { item } = editando aquele registro; {} = novo; null = fechado. { categoria } = gasto novo já com a categoria escolhida.
  const [formDespesa, setFormDespesa] = useState<{ item?: Despesa; categoria?: Categoria } | null>(null);
  const [formRecorrente, setFormRecorrente] = useState<{ item?: Recorrente } | null>(null);
  // 0 = mês atual; -1 = mês passado…
  const [deslocamento, setDeslocamento] = useState(0);
  const mes = mesIso(deslocamento);
  const [busca, setBusca] = useState('');
  const [situacaoFixo, setSituacaoFixo] = useState<'' | 'ativos' | 'pausados'>('');
  const [vista, setVista] = useState<Vista>({ tipo: 'inicio' });
  const abrir = (v: Vista) => {
    setVista(v);
    setBusca('');
    setSituacaoFixo('');
  };
  const voltar = () => abrir({ tipo: 'inicio' });

  const soma = (xs: { valor: number }[]) => xs.reduce((s, d) => s + d.valor, 0);
  const doMes = despesas.filter((d) => d.data.startsWith(mes));
  const totalRecorrente = soma(recorrentes.filter((r) => r.ativo));

  const termo = busca.trim();
  const temTermo = (d: Despesa | Recorrente) => contem(d.descricao, termo) || contem(nomeVinculo(d), termo);
  const catAberta = vista.tipo === 'categoria' ? vista.categoria : null;
  const noInicio = vista.tipo === 'inicio';
  const daCategoria = catAberta ? doMes.filter((d) => d.categoria === catAberta) : doMes;
  const lista = daCategoria.filter(temTermo);
  const fixos = recorrentes.filter((r) => (situacaoFixo === '' || r.ativo === (situacaoFixo === 'ativos')) && temTermo(r));
  const pagDespesas = usePaginacao(lista, [mes, vista, termo]);
  const pagRecorrentes = usePaginacao(fixos, [situacaoFixo, termo]);

  const linhaGasto = (d: Despesa) => (
    <Linha
      key={d.id}
      marca={diaMes(d.data)}
      titulo={d.descricao}
      subtitulo={[!catAberta && CATEGORIAS[d.categoria], nomeVinculo(d)].filter(Boolean).join(' · ') || undefined}
      valor={reais(d.valor)}
      etiqueta={d.recorrente && <Etiqueta texto="Fixo" />}
      onClick={() => setFormDespesa({ item: d })}
      dicaAcao="Corrigir ou apagar este gasto"
    />
  );

  const seletorMes = (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-borda bg-cartao p-3">
      <p className="text-center text-sm font-semibold text-texto-2">Mostrando os gastos de</p>
      <p className="-mt-2 text-center text-xl font-bold">{nomeMes(mes)}</p>
      <div className="flex w-full items-center justify-between gap-2">
        <Botao titulo="‹ Mês anterior" secundario onClick={() => setDeslocamento(deslocamento - 1)} />
        <Botao titulo="Próximo mês ›" secundario onClick={() => setDeslocamento(deslocamento + 1)} />
      </div>
      {deslocamento !== 0 && (
        <button type="button" onClick={() => setDeslocamento(0)} className="cursor-pointer text-sm font-bold text-texto-2 underline hover:opacity-80">
          Voltar para o mês atual
        </button>
      )}
    </div>
  );

  return (
    <Tela>
      {/* ---------- Topo fixo: busca e lançamento ---------- */}
      <Topo
        busca={busca}
        onBusca={setBusca}
        dica={vista.tipo === 'fixos' ? 'Procurar gasto fixo' : 'Procurar gasto (ex.: diesel)'}
        novo="+ Gasto"
        rotuloNovo="Lançar gasto"
        onNovo={() => setFormDespesa({ categoria: catAberta ?? undefined })}>
        {reais(soma(doMes))} gastos em {nomeMes(mes)} · {numero(doMes.length)} lançamentos · fixos somam {reais(totalRecorrente)} por mês
      </Topo>

      {noInicio && termo ? (
        /* ---------- Resultado da busca ---------- */
        <>
          {seletorMes}
          <Secao
            titulo={`Gastos com “${termo}” (${lista.length})`}
            descricao={`Total ${reais(soma(lista))} no mês. Toque em um gasto para corrigir ou apagar.`}
            rodape={pagDespesas.controles}>
            {lista.length === 0 && <Vazio>Nenhum gasto com esse nome neste mês.</Vazio>}
            {pagDespesas.itens.map(linhaGasto)}
          </Secao>
        </>
      ) : catAberta ? (
        /* ---------- Dentro de uma categoria ---------- */
        <>
          <Voltar para="Todas as categorias" onVoltar={voltar} titulo={CATEGORIAS[catAberta]} />
          {seletorMes}
          <Grade>
            <Cartao rotulo="Total no mês" valor={reais(soma(daCategoria))} detalhe={`${numero(daCategoria.length)} lançamentos`} />
            <Cartao rotulo="Gastos fixos" valor={reais(soma(recorrentes.filter((r) => r.ativo && r.categoria === catAberta)))} detalhe="lançados todo mês" />
          </Grade>
          <Secao
            titulo={`Gastos (${lista.length})`}
            descricao="Toque em um gasto para corrigir ou apagar."
            acao={<Botao titulo="+ Gasto nesta categoria" onClick={() => setFormDespesa({ categoria: catAberta })} />}
            rodape={pagDespesas.controles}>
            {lista.length === 0 && <Vazio>{daCategoria.length === 0 ? 'Nenhum gasto nesta categoria neste mês.' : 'Nenhum gasto com esse nome.'}</Vazio>}
            {pagDespesas.itens.map(linhaGasto)}
          </Secao>
        </>
      ) : vista.tipo === 'fixos' ? (
        /* ---------- Gastos fixos ---------- */
        <>
          <Voltar para="Todas as categorias" onVoltar={voltar} />
          <Secao
            titulo={`Gastos fixos (${fixos.length})`}
            descricao="Salários, energia, internet… São lançados sozinhos todo mês, no dia do vencimento. Toque para mudar, pausar ou excluir."
            acao={<Botao titulo="+ Novo gasto fixo" onClick={() => setFormRecorrente({})} />}
            filtros={
              recorrentes.length > 0 && (
                <Opcoes
                  rotulo="Filtrar gastos fixos"
                  valor={situacaoFixo}
                  onMudar={setSituacaoFixo}
                  opcoes={[
                    { valor: '', rotulo: 'Todos' },
                    { valor: 'ativos', rotulo: 'Lançando todo mês' },
                    { valor: 'pausados', rotulo: 'Pausados' },
                  ]}
                />
              )
            }
            rodape={pagRecorrentes.controles}>
            {fixos.length === 0 && <Vazio>{recorrentes.length === 0 ? 'Nenhum gasto fixo cadastrado.' : 'Nenhum gasto fixo com esse filtro.'}</Vazio>}
            {pagRecorrentes.itens.map((r) => (
              <Linha
                key={r.id}
                marca={`dia ${r.dia_vencimento}`}
                titulo={r.descricao}
                subtitulo={[CATEGORIAS[r.categoria], nomeVinculo(r)].filter(Boolean).join(' · ')}
                valor={reais(r.valor)}
                etiqueta={!r.ativo && <Etiqueta texto="Pausado" />}
                apagada={!r.ativo}
                onClick={() => setFormRecorrente({ item: r })}
                dicaAcao="Mudar, pausar ou excluir este gasto fixo"
              />
            ))}
          </Secao>
        </>
      ) : (
        /* ---------- Início: um cartão por categoria ---------- */
        <>
          {seletorMes}
          <Grupos titulo="Gastos do mês por categoria">
            {(Object.keys(CATEGORIAS) as Categoria[]).map((c) => {
              const daCat = doMes.filter((d) => d.categoria === c);
              return (
                <CartaoGrupo
                  key={c}
                  titulo={CATEGORIAS[c]}
                  valor={numeroCurto(soma(daCat))}
                  unidade="reais"
                  detalhes={[daCat.length === 0 ? 'nenhum lançamento' : `${numero(daCat.length)} ${daCat.length === 1 ? 'lançamento' : 'lançamentos'}`]}
                  onClick={() => abrir({ tipo: 'categoria', categoria: c })}
                />
              );
            })}
          </Grupos>

          <Secao titulo="Mais">
            <Linha
              titulo="Gastos fixos (todo mês)"
              subtitulo="Salários, energia, internet… lançados sozinhos"
              valor={`${reais(totalRecorrente)}/mês`}
              onClick={() => abrir({ tipo: 'fixos' })}
              dicaAcao="Ver e mudar os gastos fixos"
            />
          </Secao>
        </>
      )}

      {formDespesa && (
        <Formulario
          titulo={formDespesa.item ? 'Corrigir gasto' : 'Lançar gasto'}
          campos={[
            { chave: 'categoria', rotulo: 'Com o que foi o gasto', tipo: 'opcoes', opcoes: OPCOES_CATEGORIA },
            { chave: 'descricao', rotulo: 'Descrição', dica: 'Ex.: Diesel 200 litros', ajuda: 'Uma frase curta para lembrar depois.' },
            { chave: 'valor', rotulo: 'Valor pago (R$)', tipo: 'numero', dica: 'Ex.: 1250,00' },
            {
              chave: 'insumo',
              rotulo: 'Foi compra de algum insumo?',
              tipo: 'opcoes',
              opcional: true,
              ajuda: 'Se comprou ração, sal, silagem… escolha qual: a quantidade entra no estoque sozinha.',
              opcoes: [{ valor: '', rotulo: 'Não' }, ...estoque.map((e) => ({ valor: String(e.id), rotulo: e.nome }))],
              quando: (v) => v.categoria === 'alimentacao',
            },
            // Um campo de quantidade por insumo, para o nome mostrar a unidade certa.
            ...estoque.map(
              (e): Campo => ({
                chave: 'quantidade',
                rotulo: `Quantidade comprada (${e.unidade})`,
                tipo: 'numero',
                dica: 'Ex.: 2000',
                quando: (v) => v.categoria === 'alimentacao' && v.insumo === String(e.id),
              }),
            ),
            ...camposVinculo(formDespesa.item),
            { chave: 'data', rotulo: 'Data do pagamento', tipo: 'data' },
          ]}
          iniciais={
            formDespesa.item
              ? {
                  data: formDespesa.item.data,
                  categoria: formDespesa.item.categoria,
                  descricao: formDespesa.item.descricao,
                  valor: numParaTexto(formDespesa.item.valor),
                  insumo: formDespesa.item.insumo_id ? String(formDespesa.item.insumo_id) : '',
                  quantidade: formDespesa.item.quantidade ? numParaTexto(formDespesa.item.quantidade) : '',
                  ...vinculoInicial(formDespesa.item),
                }
              : formDespesa.categoria
                ? { categoria: formDespesa.categoria }
                : null
          }
          onSalvar={(v) => {
            // Insumo escolhido antes de trocar de categoria fica guardado no formulário; só vale em alimentação.
            const compra = v.categoria === 'alimentacao' && v.insumo !== '';
            return salvar('despesas', {
              ...(formDespesa.item && { id: formDespesa.item.id }),
              data: v.data,
              categoria: v.categoria as Categoria,
              descricao: v.descricao.trim(),
              valor: num(v.valor),
              insumo_id: compra ? Number(v.insumo) : null,
              quantidade: compra ? num(v.quantidade) : null,
              ...vinculo(v),
            });
          }}
          onExcluir={formDespesa.item && (() => excluir('despesas', formDespesa.item!.id))}
          salvarTexto={formDespesa.item ? 'Salvar correção' : 'Lançar gasto'}
          sucesso={formDespesa.item ? 'Gasto corrigido.' : 'Gasto lançado.'}
          excluirTexto="Apagar gasto"
          onFechar={() => setFormDespesa(null)}
        />
      )}

      {formRecorrente && (
        <Formulario
          titulo={formRecorrente.item ? `Gasto fixo: ${formRecorrente.item.descricao}` : 'Novo gasto fixo'}
          descricao="Um gasto que se repete todo mês. O app lança ele sozinho no dia do vencimento."
          campos={[
            { chave: 'descricao', rotulo: 'Descrição', dica: 'Ex.: Salário da Maria' },
            { chave: 'categoria', rotulo: 'Com o que é o gasto', tipo: 'opcoes', opcoes: OPCOES_CATEGORIA },
            { chave: 'valor', rotulo: 'Valor por mês (R$)', tipo: 'numero', dica: 'Ex.: 1900' },
            { chave: 'dia', rotulo: 'Dia do mês em que vence', tipo: 'numero', dica: 'Ex.: 5', ajuda: 'Um número de 1 a 28.' },
            {
              chave: 'ativo',
              rotulo: 'Lançar todo mês?',
              tipo: 'opcoes',
              opcoes: [
                { valor: 'sim', rotulo: 'Sim, lançar todo mês' },
                { valor: 'nao', rotulo: 'Não, pausar' },
              ],
              ajuda: 'Pause quando parar de pagar (ex.: funcionário saiu). O histórico fica guardado.',
            },
            ...camposVinculo(formRecorrente.item),
          ]}
          iniciais={
            formRecorrente.item && {
              descricao: formRecorrente.item.descricao,
              categoria: formRecorrente.item.categoria,
              valor: numParaTexto(formRecorrente.item.valor),
              dia: String(formRecorrente.item.dia_vencimento),
              ativo: formRecorrente.item.ativo ? 'sim' : 'nao',
              ...vinculoInicial(formRecorrente.item),
            }
          }
          validar={(v) => {
            const dia = num(v.dia);
            return Number.isInteger(dia) && dia >= 1 && dia <= 28 ? null : 'O dia do vencimento precisa ser um número de 1 a 28.';
          }}
          onSalvar={(v) =>
            salvar('recorrentes', {
              ...(formRecorrente.item && { id: formRecorrente.item.id }),
              descricao: v.descricao.trim(),
              categoria: v.categoria as Categoria,
              valor: num(v.valor),
              dia_vencimento: num(v.dia),
              ativo: v.ativo === 'sim',
              ...vinculo(v),
            })
          }
          onExcluir={formRecorrente.item && (() => excluir('recorrentes', formRecorrente.item!.id))}
          salvarTexto={formRecorrente.item ? 'Salvar alterações' : 'Cadastrar gasto fixo'}
          sucesso={formRecorrente.item ? 'Gasto fixo atualizado.' : 'Gasto fixo cadastrado.'}
          excluirTexto="Excluir gasto fixo"
          onFechar={() => setFormRecorrente(null)}
        />
      )}
    </Tela>
  );
}
