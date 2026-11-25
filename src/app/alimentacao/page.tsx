'use client';

import { useState } from 'react';

import { type Campo, Formulario, type Valores } from '@/components/formulario';
import { Barra, Botao, Cartao, CartaoGrupo, contem, Grade, Grupos, Linha, Secao, Tela, Topo, usePaginacao, Vazio, Voltar } from '@/components/ui';
import { criarLote, diaMes, excluir, type Insumo, insumoEmUso, nomeLote, numero, salvar, type Trato, useDados } from '@/lib/dados';
import { num, numParaTexto } from '@/lib/formato';

/** O que a tela mostra: os cartões dos insumos, os tratos de um insumo, todos os tratos ou o consumo. */
type Vista = { tipo: 'inicio' } | { tipo: 'insumo'; id: number } | { tipo: 'tratos' } | { tipo: 'consumo' };

export default function Alimentacao() {
  const { lotes, estoque, tratos } = useDados();
  // { item } = editando aquele registro; {} = novo; null = fechado. { insumo } = trato novo já com o insumo escolhido.
  const [formInsumo, setFormInsumo] = useState<{ item?: Insumo } | null>(null);
  const [formTrato, setFormTrato] = useState<{ item?: Trato; insumo?: number } | null>(null);
  const [busca, setBusca] = useState('');
  const [vista, setVista] = useState<Vista>({ tipo: 'inicio' });
  const abrir = (v: Vista) => {
    setVista(v);
    setBusca('');
  };
  const voltar = () => abrir({ tipo: 'inicio' });

  const baixos = estoque.filter((e) => e.saldo < e.minimo);
  const ultimoDia = tratos[0]?.data;

  const consumo = Object.entries(
    tratos.reduce<Record<string, number>>((acc, t) => ({ ...acc, [t.insumo]: (acc[t.insumo] ?? 0) + t.quantidade }), {}),
  );
  const maiorConsumo = Math.max(...consumo.map(([, v]) => v));

  const termo = busca.trim();
  const insumoAberto = vista.tipo === 'insumo' ? estoque.find((e) => e.id === vista.id) : undefined;
  const noInicio = !insumoAberto && vista.tipo !== 'tratos' && vista.tipo !== 'consumo';
  const doInsumo = insumoAberto ? tratos.filter((t) => t.insumo_id === insumoAberto.id) : [];
  // Dentro de um insumo a busca procura o lote; no resto, insumo ou lote.
  const lista = insumoAberto
    ? doInsumo.filter((t) => contem(nomeLote(lotes, t.lote_id), termo))
    : tratos.filter((t) => contem(t.insumo, termo) || contem(nomeLote(lotes, t.lote_id), termo));
  const pagTratos = usePaginacao(lista, [termo, vista]);

  const linhaTrato = (t: Trato, mostrarInsumo: boolean) => (
    <Linha
      key={t.id}
      marca={diaMes(t.data)}
      titulo={mostrarInsumo ? t.insumo : nomeLote(lotes, t.lote_id)}
      subtitulo={mostrarInsumo ? nomeLote(lotes, t.lote_id) : undefined}
      valor={`${numero(t.quantidade)} ${t.unidade}`}
      onClick={() => setFormTrato({ item: t })}
      dicaAcao="Corrigir ou apagar este trato"
    />
  );
  const vazioTratos = <Vazio>{tratos.length === 0 ? 'Nenhum trato registrado ainda. Toque em “+ Trato”.' : 'Nenhum trato com esse insumo ou lote.'}</Vazio>;

  return (
    <Tela>
      {/* ---------- Topo fixo: busca e registro de trato ---------- */}
      <Topo
        busca={busca}
        onBusca={setBusca}
        dica={insumoAberto ? 'Procurar lote' : 'Procurar insumo ou lote'}
        novo="+ Trato"
        rotuloNovo="Registrar trato"
        onNovo={() => setFormTrato({ insumo: insumoAberto?.id })}>
        {numero(estoque.length)} {estoque.length === 1 ? 'insumo' : 'insumos'}
        {baixos.length > 0 ? ` · ${numero(baixos.length)} para comprar` : ' · estoque em ordem'}
        {ultimoDia && ` · último trato em ${diaMes(ultimoDia)}`}
      </Topo>

      {noInicio && termo ? (
        /* ---------- Resultado da busca ---------- */
        <Secao titulo={`Tratos com “${termo}” (${lista.length})`} descricao="Toque em um trato para corrigir ou apagar." rodape={pagTratos.controles}>
          {lista.length === 0 && vazioTratos}
          {pagTratos.itens.map((t) => linhaTrato(t, true))}
        </Secao>
      ) : insumoAberto ? (
        /* ---------- Dentro de um insumo ---------- */
        <>
          <Voltar
            para="Todos os insumos"
            onVoltar={voltar}
            titulo={insumoAberto.nome}
            acao={<Botao titulo="Editar insumo" secundario onClick={() => setFormInsumo({ item: insumoAberto })} />}
          />
          {(() => {
            const { saldo, minimo, unidade } = insumoAberto;
            const baixo = saldo < minimo;
            return (
              <Grade>
                <Cartao rotulo="Em estoque" valor={`${numero(Math.round(saldo))} ${unidade}`} detalhe={baixo ? 'abaixo do mínimo: comprar' : 'tudo em ordem'} alerta={baixo} />
                <Cartao rotulo="Avisa abaixo de" valor={`${numero(minimo)} ${unidade}`} />
                <Cartao rotulo="Já usado em tratos" valor={`${numero(doInsumo.reduce((s, t) => s + t.quantidade, 0))} ${unidade}`} detalhe={`${numero(doInsumo.length)} tratos`} />
              </Grade>
            );
          })()}
          <Secao
            titulo={`Tratos (${lista.length})`}
            descricao="Toque em um trato para corrigir ou apagar. Use a busca no topo para ver os de um lote."
            acao={<Botao titulo="+ Trato deste insumo" onClick={() => setFormTrato({ insumo: insumoAberto.id })} />}
            rodape={pagTratos.controles}>
            {lista.length === 0 && <Vazio>{doInsumo.length === 0 ? 'Nenhum trato com este insumo ainda.' : 'Nenhum trato nesse lote.'}</Vazio>}
            {pagTratos.itens.map((t) => linhaTrato(t, false))}
          </Secao>
        </>
      ) : vista.tipo === 'tratos' ? (
        /* ---------- Todos os tratos ---------- */
        <>
          <Voltar para="Todos os insumos" onVoltar={voltar} />
          <Secao
            titulo={`Tratos (${lista.length})`}
            descricao="O que foi dado de comer a cada lote. Toque para corrigir ou apagar. Use a busca no topo para procurar insumo ou lote."
            rodape={pagTratos.controles}>
            {lista.length === 0 && vazioTratos}
            {pagTratos.itens.map((t) => linhaTrato(t, true))}
          </Secao>
        </>
      ) : vista.tipo === 'consumo' ? (
        /* ---------- Consumo por insumo ---------- */
        <>
          <Voltar para="Todos os insumos" onVoltar={voltar} />
          <Secao titulo="Quanto já foi usado de cada insumo" descricao="Soma de todos os tratos registrados.">
            {consumo.length === 0 && <Vazio>Nenhum trato registrado ainda.</Vazio>}
            {consumo
              .filter(([insumo]) => contem(insumo, termo))
              .map(([insumo, total]) => (
                <Barra key={insumo} rotulo={insumo} valor={numero(total)} fracao={total / maiorConsumo} />
              ))}
          </Secao>
        </>
      ) : (
        /* ---------- Início: um cartão por insumo ---------- */
        <>
          <Grupos
            titulo="Estoque"
            vazio={estoque.length === 0 && 'Comece cadastrando o que é dado ao gado (ração, sal mineral, silagem…). Sobe com as compras no Financeiro e desce com os tratos.'}
            novo="+ Novo insumo"
            onNovo={() => setFormInsumo({})}>
            {estoque.map((e) => {
              const baixo = e.saldo < e.minimo;
              return (
                <CartaoGrupo
                  key={e.id}
                  titulo={e.nome}
                  valor={numero(Math.round(e.saldo))}
                  unidade={e.unidade}
                  alerta={baixo}
                  detalhes={[baixo ? 'Abaixo do mínimo: comprar' : `mínimo ${numero(e.minimo)} ${e.unidade}`]}
                  onClick={() => abrir({ tipo: 'insumo', id: e.id })}
                />
              );
            })}
          </Grupos>

          <Secao titulo="Mais">
            <Linha
              titulo="Tratos"
              subtitulo="Corrigir ou apagar um trato"
              valor={numero(tratos.length)}
              onClick={() => abrir({ tipo: 'tratos' })}
              dicaAcao="Ver todos os tratos"
            />
            <Linha titulo="Consumo por insumo" subtitulo="Quanto já foi usado de cada um" onClick={() => abrir({ tipo: 'consumo' })} dicaAcao="Ver o consumo de cada insumo" />
          </Secao>
        </>
      )}

      {formInsumo && (
        <Formulario
          titulo={formInsumo.item ? `Insumo ${formInsumo.item.nome}` : 'Novo insumo'}
          descricao={formInsumo.item ? `Em estoque hoje: ${numero(Math.round(formInsumo.item.saldo))} ${formInsumo.item.unidade}.` : 'Ração, sal mineral, silagem, vacina, remédio…'}
          campos={[
            { chave: 'nome', rotulo: 'Nome do insumo', dica: 'Ex.: Sal mineral' },
            {
              chave: 'unidade',
              rotulo: 'Como é medido',
              tipo: 'opcoes',
              opcoes: [
                { valor: 'kg', rotulo: 'Quilos (kg)' },
                { valor: 'L', rotulo: 'Litros (L)' },
                { valor: 'doses', rotulo: 'Doses' },
                { valor: 'un', rotulo: 'Unidades' },
              ],
            },
            { chave: 'minimo', rotulo: 'Avisar quando ficar abaixo de', tipo: 'numero', dica: 'Ex.: 200', ajuda: 'O app mostra um alerta para comprar mais quando o estoque chegar nesse valor.' },
            {
              chave: 'inicial',
              // Na edição o saldo atual já inclui compras e tratos; este campo é só o ponto de partida.
              rotulo: formInsumo.item ? 'Quanto tinha quando foi cadastrado' : 'Quanto tem guardado hoje',
              tipo: 'numero',
              opcional: true,
              ajuda: formInsumo.item
                ? 'Só mude se cadastrou errado. Compras e tratos são somados e subtraídos sozinhos.'
                : 'Depois, as compras lançadas no Financeiro somam e os tratos descontam sozinhos.',
            },
          ]}
          iniciais={
            formInsumo.item && {
              nome: formInsumo.item.nome,
              unidade: formInsumo.item.unidade,
              minimo: numParaTexto(formInsumo.item.minimo),
              inicial: formInsumo.item.saldo_inicial ? numParaTexto(formInsumo.item.saldo_inicial) : '',
            }
          }
          validar={(v) =>
            estoque.some((e) => e.nome.toLowerCase() === v.nome.trim().toLowerCase() && e.id !== formInsumo.item?.id)
              ? 'Já existe um insumo com esse nome.'
              : null
          }
          onSalvar={(v) =>
            salvar('insumos', {
              ...(formInsumo.item && { id: formInsumo.item.id }),
              nome: v.nome.trim(),
              unidade: v.unidade,
              minimo: num(v.minimo),
              saldo_inicial: v.inicial.trim() ? num(v.inicial) : 0,
            })
          }
          onExcluir={
            formInsumo.item &&
            (() => {
              const { id } = formInsumo.item!;
              if (insumoEmUso(id)) return 'Não dá para excluir: este insumo já tem tratos ou compras registrados.';
              voltar();
              return excluir('insumos', id);
            })
          }
          salvarTexto={formInsumo.item ? 'Salvar alterações' : 'Cadastrar insumo'}
          sucesso={formInsumo.item ? 'Insumo atualizado.' : 'Insumo cadastrado.'}
          excluirTexto="Excluir insumo"
          onFechar={() => setFormInsumo(null)}
        />
      )}

      {formTrato && (
        <Formulario
          titulo={formTrato.item ? 'Corrigir trato' : 'Registrar trato'}
          descricao="O que foi dado de comer. A quantidade sai do estoque."
          campos={[
            { chave: 'insumo', rotulo: 'O que foi dado', tipo: 'opcoes', opcoes: estoque.map((e) => ({ valor: String(e.id), rotulo: e.nome })) },
            { chave: 'lote', rotulo: 'Para qual lote', tipo: 'opcoes', opcoes: lotes.map((l) => ({ valor: String(l.id), rotulo: l.nome })), novo: { rotulo: '+ Novo lote', dica: 'Ex.: Pasto do Fundo', criar: criarLote } },
            // Um campo de quantidade por insumo, para o nome mostrar a unidade e o estoque certos.
            ...estoque.map((e): Campo => ({
              chave: 'quantidade',
              rotulo: `Quantidade (${e.unidade})`,
              tipo: 'numero',
              dica: 'Ex.: 150',
              ajuda: `Tem ${numero(Math.round(e.saldo))} ${e.unidade} de ${e.nome} em estoque.`,
              quando: (v: Valores) => v.insumo === String(e.id),
            })),
            { chave: 'data', rotulo: 'Data', tipo: 'data' },
          ]}
          iniciais={
            formTrato.item
              ? {
                  data: formTrato.item.data,
                  lote: String(formTrato.item.lote_id),
                  insumo: String(formTrato.item.insumo_id),
                  quantidade: numParaTexto(formTrato.item.quantidade),
                }
              : formTrato.insumo
                ? { insumo: String(formTrato.insumo) }
                : null
          }
          validar={(v) => {
            const insumo = estoque.find((e) => e.id === Number(v.insumo));
            if (!insumo) return 'Antes, cadastre o insumo (cartão “+ Novo insumo”).';
            if (!v.lote) return 'Escolha o lote ou crie um em “+ Novo lote”.';
            // Na edição, o que este trato já tinha consumido do mesmo insumo volta a contar como disponível.
            const disponivel = insumo.saldo + (formTrato.item?.insumo_id === insumo.id ? formTrato.item.quantidade : 0);
            return num(v.quantidade) > disponivel ? `Não tem tudo isso em estoque: só ${numero(Math.round(disponivel))} ${insumo.unidade} de ${insumo.nome}. Lance a compra no Financeiro antes.` : null;
          }}
          onSalvar={(v) =>
            salvar('tratos', {
              ...(formTrato.item && { id: formTrato.item.id }),
              data: v.data,
              lote_id: Number(v.lote),
              insumo_id: Number(v.insumo),
              quantidade: num(v.quantidade),
            })
          }
          onExcluir={formTrato.item && (() => excluir('tratos', formTrato.item!.id))}
          salvarTexto={formTrato.item ? 'Salvar correção' : 'Registrar trato'}
          sucesso={formTrato.item ? 'Trato corrigido.' : 'Trato registrado.'}
          excluirTexto="Apagar trato"
          onFechar={() => setFormTrato(null)}
        />
      )}
    </Tela>
  );
}
