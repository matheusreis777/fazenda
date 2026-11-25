'use client';

import clsx from 'clsx';
import Link from 'next/link';

import { Area, BarrasDeitadas, CartaoGrafico, Colunas, cor, Legenda, Segmentada, TabelaDados, Tendencia } from '@/components/graficos';
import { Etiqueta, Icone, type NomeIcone, Linha, Tela } from '@/components/ui';
import { CATEGORIAS, type Categoria, diaMes, evolucaoPeso, modoExemplo, nomeLote, nomeMes, numero, proximosManejos, reais, somarDias, useDados } from '@/lib/dados';
import { hojeIso } from '@/lib/formato';
import { cabecasEm, fimDoMes, mesCurto, somaPorMes, ultimosMeses, variacao } from '@/lib/painel';

function saudacao() {
  const hora = new Date().getHours();
  return hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
}

/** R$ 153 mil, R$ 1,2 mi — para eixos e cartões. */
const reaisCurto = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: v >= 1_000_000 ? 1 : 0 });
const kgDia = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} kg/dia`;
const porcento = (v: number) => `${Math.abs(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;

/** Variação com seta; a cor diz se é boa ou ruim (gasto subindo é ruim, rebanho crescendo é bom). */
function Variacao({ valor, subirEhBom, referencia }: { valor: number | null; subirEhBom: boolean; referencia: string }) {
  if (valor === null) return <span className="text-sm font-medium text-texto-2">sem base de comparação</span>;
  const subiu = valor > 0;
  const bom = valor === 0 || subiu === subirEhBom;
  return (
    <span className={clsx('text-sm font-semibold', bom ? 'text-sobe-bom' : 'text-alerta')}>
      <span aria-hidden="true">{valor === 0 ? '■' : subiu ? '▲' : '▼'}</span> {porcento(valor)}{' '}
      <span className="font-medium text-texto-2">{referencia}</span>
    </span>
  );
}

/** Cartão de indicador: rótulo, valor grande, variação e mini-tendência. */
function Indicador({
  rotulo,
  valor,
  icone,
  alerta,
  href,
  children,
}: {
  rotulo: string;
  valor: string;
  icone: NomeIcone;
  alerta?: boolean;
  href: string;
  children?: React.ReactNode;
}) {
  return (
    <Link href={href} className="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-borda bg-cartao p-4 transition-opacity hover:opacity-85">
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-texto-2">{rotulo}</span>
        <span className={clsx('flex size-8 shrink-0 items-center justify-center rounded-full', alerta ? 'bg-alerta-suave text-alerta' : 'bg-primaria-suave text-texto')}>
          <Icone nome={icone} className="size-[18px]" />
        </span>
      </span>
      <span className={clsx('text-2xl font-bold', alerta && 'text-alerta')}>{valor}</span>
      {children}
    </Link>
  );
}

export default function Inicio() {
  const { lotes, animais, despesas, estoque, sanidade, pesagens } = useDados();
  const hoje = hojeIso();
  const meses = ultimosMeses(12, hoje);
  const rotulos = meses.map(mesCurto);
  const titulos = meses.map(nomeMes);
  const ultimoMes = meses.length - 1;

  // Séries mensais (12 meses)
  const saidasComValor = animais.filter((a) => a.saida_tipo === 'venda' || a.saida_tipo === 'abate');
  const vendasMes = somaPorMes(saidasComValor, meses, (a) => a.saida_data, (a) => a.saida_valor ?? 0);
  const gastosMes = somaPorMes(despesas, meses, (d) => d.data, (d) => d.valor);
  const comprasMes = somaPorMes(animais.filter((a) => a.entrada_tipo === 'compra'), meses, (a) => a.entrada_data, (a) => a.entrada_valor ?? 0);
  const cabecasMes = meses.map((m, i) => cabecasEm(animais, i === ultimoMes ? hoje : fimDoMes(m)));
  const custoCabecaMes = meses.map((_, i) => (cabecasMes[i] ? gastosMes[i] / cabecasMes[i] : 0));

  // Indicadores
  const ativos = animais.filter((a) => !a.saida_data);
  const umAnoAtras = `${Number(hoje.slice(0, 4)) - 1}${hoje.slice(4)}`;
  const cabecasAntes = cabecasEm(animais, umAnoAtras);
  const totalVendas = vendasMes.reduce((s, v) => s + v, 0);
  const totalGastos = gastosMes.reduce((s, v) => s + v, 0);
  const totalCompras = comprasMes.reduce((s, v) => s + v, 0);
  const resultado = totalVendas - totalCompras - totalGastos;
  const gmds = ativos.map((a) => evolucaoPeso(a, pesagens).gmd).filter((g): g is number => g !== null);
  const gmdMedio = gmds.length ? gmds.reduce((s, g) => s + g, 0) / gmds.length : null;
  const baixos = estoque.filter((e) => e.saldo < e.minimo);
  const manejos = proximosManejos(sanidade, somarDias(hoje, 7));
  const atrasados = manejos.filter((s) => s.proxima_data! < hoje);

  // Gastos por categoria e ganho por lote
  const gastos12 = despesas.filter((d) => d.data >= `${meses[0]}-01`);
  const porCategoria = (Object.keys(CATEGORIAS) as Categoria[]).map((c) => {
    const v = gastos12.filter((d) => d.categoria === c).reduce((s, d) => s + d.valor, 0);
    return { nome: CATEGORIAS[c], valor: v, texto: reaisCurto(v) };
  });
  const ganhoPorLote = lotes
    .map((l) => {
      const g = ativos
        .filter((a) => a.lote_id === l.id)
        .map((a) => evolucaoPeso(a, pesagens).gmd)
        .filter((x): x is number => x !== null);
      const media = g.length ? g.reduce((s, x) => s + x, 0) / g.length : null;
      return { nome: l.nome, valor: media ?? 0, texto: media === null ? '—' : kgDia(media), tem: media !== null };
    })
    .filter((l) => l.tem);

  // Composição do rebanho por raça: as 5 maiores + "Outras" (no máximo 6 partes)
  const porRaca = Object.entries(ativos.reduce<Record<string, number>>((acc, a) => ({ ...acc, [a.raca || 'Sem raça']: (acc[a.raca || 'Sem raça'] ?? 0) + 1 }), {}))
    .sort((a, b) => b[1] - a[1])
    .map(([nome, valor]) => ({ nome, valor }));
  const racas = porRaca.length > 6 ? [...porRaca.slice(0, 5), { nome: 'Outras', valor: porRaca.slice(5).reduce((s, p) => s + p.valor, 0) }] : porRaca;

  const dataHoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Tela>
      <div>
        <p className="text-2xl font-bold">{saudacao()}</p>
        <p className="font-medium text-texto-2">{dataHoje.charAt(0).toUpperCase() + dataHoje.slice(1)}</p>
        {modoExemplo() && <p className="text-sm font-medium text-texto-2">Dados de exemplo: o que você lançar some ao recarregar a página.</p>}
      </div>

      {/* Destaque: o número que o painel lidera */}
      <section className="grid gap-5 rounded-3xl border border-borda bg-cartao p-6 md:grid-cols-[auto_1fr] md:items-end md:gap-10">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-texto-2">Cabeças no rebanho</span>
          <span className="text-6xl leading-none font-bold tracking-tight">{numero(ativos.length)}</span>
          <Variacao valor={variacao(ativos.length, cabecasAntes)} subirEhBom referencia={`vs ${numero(cabecasAntes)} há um ano`} />
          <span className="text-sm font-medium text-texto-2">
            em {lotes.length} lotes · {numero(ativos.filter((a) => a.sexo === 'M').length)} machos ·{' '}
            {numero(ativos.filter((a) => a.sexo === 'F').length)} fêmeas
          </span>
        </div>
        <Area rotulos={rotulos} titulos={titulos} valores={cabecasMes} nome="Cabeças no fim do mês" formatar={(v) => `${numero(v)} cab.`} formatarEixo={numero} altura={130} />
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Vendas em 12 meses" valor={reaisCurto(totalVendas)} icone="vendas" href="/relatorios">
          <span className="text-sm font-medium text-texto-2">{numero(saidasComValor.filter((a) => a.saida_data! >= `${meses[0]}-01`).length)} animais vendidos</span>
          <Tendencia valores={vendasMes} rotulo="Vendas por mês nos últimos 12 meses" />
        </Indicador>
        <Indicador rotulo="Gastos do mês" valor={reaisCurto(gastosMes[ultimoMes])} icone="financeiro" href="/financeiro">
          <Variacao valor={variacao(gastosMes[ultimoMes], gastosMes[ultimoMes - 1])} subirEhBom={false} referencia="vs mês passado" />
          <Tendencia valores={gastosMes} rotulo="Gastos por mês nos últimos 12 meses" />
        </Indicador>
        <Indicador rotulo="Ganho médio de peso" valor={gmdMedio === null ? '—' : kgDia(gmdMedio)} icone="rebanho" href="/rebanho">
          <span className="text-sm font-medium text-texto-2">{numero(gmds.length)} animais pesados</span>
        </Indicador>
        <Indicador rotulo="Custo por cabeça no mês" valor={reaisCurto(custoCabecaMes[ultimoMes - 1])} icone="relatorios" href="/relatorios">
          <span className="text-sm font-medium text-texto-2">{nomeMes(meses[ultimoMes - 1])}</span>
          <Tendencia valores={custoCabecaMes.slice(0, -1)} rotulo="Custo por cabeça por mês" />
        </Indicador>
        <Indicador rotulo="Resultado em 12 meses" valor={reaisCurto(resultado)} icone="vendas" alerta={resultado < 0} href="/relatorios">
          <span className="text-sm font-medium text-texto-2">vendas − compras de animais − gastos</span>
        </Indicador>
        <Indicador rotulo="Compra de animais" valor={reaisCurto(totalCompras)} icone="rebanho" href="/rebanho">
          <span className="text-sm font-medium text-texto-2">
            {numero(animais.filter((a) => a.entrada_tipo === 'compra' && a.entrada_data >= `${meses[0]}-01`).length)} animais em 12 meses
          </span>
        </Indicador>
        <Indicador rotulo="Sanidade atrasada" valor={numero(atrasados.length)} icone="sanidade" alerta={atrasados.length > 0} href="/sanidade">
          <span className="text-sm font-medium text-texto-2">{numero(manejos.length - atrasados.length)} para esta semana</span>
        </Indicador>
        <Indicador rotulo="Estoque baixo" valor={numero(baixos.length)} icone={baixos.length ? 'alerta' : 'estoque'} alerta={baixos.length > 0} href="/alimentacao">
          <span className="text-sm font-medium text-texto-2">{baixos.length ? baixos.map((b) => b.nome).join(', ') : 'tudo em ordem'}</span>
        </Indicador>
      </div>

      <CartaoGrafico titulo="Vendas × gastos por mês" subtitulo="Últimos 12 meses. A compra de animais fica de fora (está em Relatórios).">
        <Legenda
          itens={[
            { nome: 'Vendas', cor: cor(1) },
            { nome: 'Gastos', cor: cor(2) },
          ]}
        />
        <Colunas
          rotulos={rotulos}
          titulos={titulos}
          series={[
            { nome: 'Vendas', cor: cor(1), valores: vendasMes },
            { nome: 'Gastos', cor: cor(2), valores: gastosMes },
          ]}
          formatar={reais}
          formatarEixo={reaisCurto}
        />
        <TabelaDados colunas={['Mês', 'Vendas', 'Gastos']} linhas={meses.map((m, i) => [titulos[i], reais(vendasMes[i]), reais(gastosMes[i])])} />
      </CartaoGrafico>

      <div className="grid gap-6 lg:grid-cols-2">
        <CartaoGrafico titulo="Gastos por categoria" subtitulo={`Últimos 12 meses · total ${reais(totalGastos)}`}>
          <BarrasDeitadas itens={porCategoria} />
        </CartaoGrafico>
        <CartaoGrafico titulo="Ganho de peso por lote" subtitulo="Média dos animais ativos, desde a entrada">
          <BarrasDeitadas itens={ganhoPorLote} corSerie={cor(3)} />
        </CartaoGrafico>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CartaoGrafico titulo="Rebanho por raça" subtitulo={`${numero(ativos.length)} cabeças ativas`}>
          <Segmentada partes={racas} unidade="cab." />
        </CartaoGrafico>
        <CartaoGrafico titulo="Custo por cabeça" subtitulo="Gastos do mês ÷ cabeças no fim do mês">
          <Area rotulos={rotulos.slice(0, -1)} titulos={titulos.slice(0, -1)} valores={custoCabecaMes.slice(0, -1)} nome="Custo por cabeça" corSerie={cor(2)} formatar={reais} formatarEixo={reaisCurto} altura={150} />
        </CartaoGrafico>
      </div>

      {(manejos.length > 0 || baixos.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {manejos.length > 0 && (
            <CartaoGrafico titulo="Sanidade nesta semana" acao={<Link href="/sanidade" className="text-sm font-bold text-texto-2 hover:opacity-80">Ver tudo ›</Link>}>
              <div className="-my-2 divide-y divide-borda">
                {manejos.map((s) => (
                  <Linha
                    key={s.id}
                    marca={diaMes(s.proxima_data!)}
                    titulo={s.produto}
                    subtitulo={s.lote_id ? `Lote ${nomeLote(lotes, s.lote_id)}` : `Brinco ${animais.find((a) => a.id === s.animal_id)?.brinco ?? '—'}`}
                    etiqueta={s.proxima_data! < hoje ? <Etiqueta texto="Atrasado" tom="alerta" /> : undefined}
                  />
                ))}
              </div>
            </CartaoGrafico>
          )}
          {baixos.length > 0 && (
            <CartaoGrafico titulo="Repor estoque" acao={<Link href="/alimentacao" className="text-sm font-bold text-texto-2 hover:opacity-80">Ver tudo ›</Link>}>
              <div className="-my-2 divide-y divide-borda">
                {baixos.map((e) => (
                  <Linha
                    key={e.id}
                    titulo={e.nome}
                    subtitulo={`mínimo ${numero(e.minimo)} ${e.unidade}`}
                    valor={`${numero(Math.round(e.saldo))} ${e.unidade}`}
                    etiqueta={<Etiqueta texto="Baixo" tom="alerta" />}
                    alerta
                  />
                ))}
              </div>
            </CartaoGrafico>
          )}
        </div>
      )}
    </Tela>
  );
}
