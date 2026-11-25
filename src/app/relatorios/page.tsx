'use client';

import { useState } from 'react';

import { Barra, Botao, Cartao, Chip, Grade, Linha, Secao, Tela, Vazio } from '@/components/ui';
import { CATEGORIAS, type Categoria, evolucaoPeso, mesIso, nomeMes, numero, reais, somarDias, useDados } from '@/lib/dados';
import { hojeIso } from '@/lib/formato';

type Periodo = 'mes' | 'ano';

/** Barras de um "nome → valor", da maior para a menor. */
function Ranking({ itens, formatar }: { itens: [string, number][]; formatar: (v: number) => string }) {
  const ordenados = itens.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (ordenados.length === 0) return <Vazio>Nada no período.</Vazio>;
  const maior = ordenados[0][1];
  return ordenados.map(([nome, v]) => <Barra key={nome} rotulo={nome} valor={formatar(v)} fracao={v / maior} />);
}

export default function Relatorios() {
  const { animais, despesas, tratos, pesagens, sanidade, funcionarios, maquinas, lotes, nomeFazenda } = useDados();
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  // 0 = atual; -1 = anterior…
  const [deslocamento, setDeslocamento] = useState(0);

  const hoje = hojeIso();
  const prefixo = periodo === 'mes' ? mesIso(deslocamento) : String(Number(hoje.slice(0, 4)) + deslocamento);
  const titulo = periodo === 'mes' ? nomeMes(prefixo) : prefixo;
  const fim = periodo === 'mes' ? somarDias(`${mesIso(deslocamento + 1)}-01`, -1) : `${prefixo}-12-31`;
  const noPeriodo = (data: string | null) => !!data && data.startsWith(prefixo);

  // Rebanho
  const entradas = animais.filter((a) => noPeriodo(a.entrada_data));
  const compras = entradas.filter((a) => a.entrada_tipo === 'compra');
  const custoCompras = compras.reduce((s, a) => s + (a.entrada_valor ?? 0), 0);
  const saidas = animais.filter((a) => noPeriodo(a.saida_data));
  const vendas = saidas.filter((a) => a.saida_tipo === 'venda');
  const receita = vendas.reduce((s, a) => s + (a.saida_valor ?? 0), 0);
  const ativosNoFim = animais.filter((a) => a.entrada_data <= fim && (!a.saida_data || a.saida_data > fim));

  // Financeiro
  const gastos = despesas.filter((d) => noPeriodo(d.data));
  const totalGastos = gastos.reduce((s, d) => s + d.valor, 0);
  const resultado = receita - custoCompras - totalGastos;
  const porCategoria = (Object.keys(CATEGORIAS) as Categoria[]).map(
    (c): [string, number] => [CATEGORIAS[c], gastos.filter((d) => d.categoria === c).reduce((s, d) => s + d.valor, 0)],
  );
  const porFuncionario = funcionarios.map((f): [string, number] => [f.nome, gastos.filter((d) => d.funcionario_id === f.id).reduce((s, d) => s + d.valor, 0)]);
  const porMaquina = maquinas.map((m): [string, number] => [m.nome, gastos.filter((d) => d.maquina_id === m.id).reduce((s, d) => s + d.valor, 0)]);

  // Alimentação, peso e sanidade
  const consumo = new Map<string, number>();
  for (const t of tratos.filter((t) => noPeriodo(t.data))) {
    const chave = `${t.insumo} (${t.unidade})`;
    consumo.set(chave, (consumo.get(chave) ?? 0) + t.quantidade);
  }
  const pesagensPeriodo = pesagens.filter((p) => noPeriodo(p.data));
  const gmds = ativosNoFim.map((a) => evolucaoPeso(a, pesagens).gmd).filter((g): g is number => g !== null);
  const gmdMedio = gmds.length ? gmds.reduce((s, g) => s + g, 0) / gmds.length : null;
  const aplicacoes = sanidade.filter((s) => noPeriodo(s.data));

  return (
    <Tela>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex gap-2">
          <Chip titulo="Mês" ativo={periodo === 'mes'} onClick={() => (setPeriodo('mes'), setDeslocamento(0))} />
          <Chip titulo="Ano" ativo={periodo === 'ano'} onClick={() => (setPeriodo('ano'), setDeslocamento(0))} />
        </div>
        <div className="flex items-center gap-2">
          <Botao titulo="‹" secundario rotuloAcessivel="Período anterior" onClick={() => setDeslocamento(deslocamento - 1)} />
          <span className="min-w-36 text-center text-lg font-bold">{titulo}</span>
          <Botao titulo="›" secundario rotuloAcessivel="Próximo período" onClick={() => setDeslocamento(deslocamento + 1)} />
        </div>
        <Botao titulo="Imprimir / PDF" secundario onClick={() => window.print()} />
      </div>
      <h2 className="hidden text-2xl font-bold print:block">
        {nomeFazenda ? `${nomeFazenda} · Relatório` : 'Relatório da fazenda'} · {titulo}
      </h2>

      <Grade>
        <Cartao icone="vendas" rotulo="Receita de vendas" valor={reais(receita)} detalhe={`${vendas.length} animais`} />
        <Cartao icone="financeiro" rotulo="Gastos" valor={reais(totalGastos)} detalhe={`${gastos.length} lançamentos`} />
        <Cartao rotulo="Compra de animais" valor={reais(custoCompras)} detalhe={`${compras.length} animais`} />
        <Cartao
          rotulo="Resultado"
          valor={reais(resultado)}
          detalhe="vendas − compras − gastos"
          alerta={resultado < 0}
        />
        <Cartao
          rotulo="Custo por cabeça"
          valor={ativosNoFim.length ? reais(totalGastos / ativosNoFim.length) : '—'}
          detalhe={`${numero(ativosNoFim.length)} cabeças no fim do período`}
        />
        <Cartao
          rotulo="Ganho médio de peso"
          valor={gmdMedio === null ? '—' : `${gmdMedio.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg/dia`}
          detalhe={`${pesagensPeriodo.length} pesagens no período`}
        />
      </Grade>

      <Secao titulo="Movimento do rebanho">
        <Linha titulo="Entradas por compra" valor={numero(compras.length)} />
        <Linha titulo="Nascimentos" valor={numero(entradas.length - compras.length)} />
        <Linha titulo="Vendas" valor={numero(vendas.length)} />
        <Linha titulo="Abates" valor={numero(saidas.filter((a) => a.saida_tipo === 'abate').length)} />
        <Linha titulo="Mortes" valor={numero(saidas.filter((a) => a.saida_tipo === 'morte').length)} alerta={saidas.some((a) => a.saida_tipo === 'morte')} />
        <Linha titulo="Cabeças no fim do período" valor={numero(ativosNoFim.length)} />
      </Secao>

      <Secao titulo="Cabeças por lote no fim do período">
        <Ranking itens={lotes.map((l) => [l.nome, ativosNoFim.filter((a) => a.lote_id === l.id).length])} formatar={(v) => `${numero(v)} cab.`} />
      </Secao>

      <Secao titulo="Gastos por categoria">
        <Ranking itens={porCategoria} formatar={reais} />
      </Secao>

      <div className="grid gap-6 md:grid-cols-2">
        <Secao titulo="Gastos por funcionário">
          <Ranking itens={porFuncionario} formatar={reais} />
        </Secao>
        <Secao titulo="Gastos por máquina">
          <Ranking itens={porMaquina} formatar={reais} />
        </Secao>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Secao titulo="Consumo de insumos">
          <Ranking itens={[...consumo.entries()]} formatar={numero} />
        </Secao>
        <Secao titulo={`Sanidade (${aplicacoes.length} aplicações)`}>
          <Ranking
            itens={[...aplicacoes.reduce((m, s) => m.set(s.produto, (m.get(s.produto) ?? 0) + 1), new Map<string, number>()).entries()]}
            formatar={(v) => `${numero(v)}×`}
          />
        </Secao>
      </div>
    </Tela>
  );
}
