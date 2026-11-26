'use client';

import clsx from 'clsx';
import Link from 'next/link';

import { Area, BarrasDeitadas, CartaoGrafico, Colunas, cor, Legenda, Segmentada, Selo, TabelaDados, Tendencia } from '@/components/graficos';
import { Etiqueta, Icone, type NomeIcone, Linha, quebravel, Tela } from '@/components/ui';
import { CATEGORIAS, type Categoria, diaMes, evolucaoPeso, modoExemplo, nomeLote, nomeMes, numero, numeroCurto, pendentesBrucelose, proximosManejos, reais, somarDias, useDados } from '@/lib/dados';
import { hojeIso } from '@/lib/formato';
import { cabecasEm, fimDoMes, mesCurto, somaPorMes, ultimosMeses, variacao } from '@/lib/painel';

// Cor de cada assunto, a mesma nos cartões e nos gráficos (paleta fixa de globals.css):
// vendas = 1 (azul), gastos e custos = 2 (laranja), ganho de peso = 3 (verde-água), compra de animais = 5, rebanho = 6 (verde).
// Resultado, sanidade e estoque usam as cores de situação (verde = em ordem, vermelho = atenção), sempre com texto junto.
const BOM = 'var(--sobe-bom)';
const RUIM = 'var(--alerta)';

/** R$ 153 mil, R$ 1,2 mi — para cartões e barras. Nos eixos vai sem "R$" (numeroCurto): com ele o rótulo não cabe na margem. */
const reaisCurto = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: v >= 1_000_000 ? 1 : 0 });
const kgDia = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} kg/dia`;
const porcento = (v: number) => `${Math.abs(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;
const media = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

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

/** Cartão de indicador: selo e leve tom da cor do assunto, valor grande, detalhe e mini-tendência. */
function Indicador({
  rotulo,
  valor,
  icone,
  cor: corAssunto,
  alerta,
  href,
  children,
}: {
  rotulo: string;
  valor: string;
  icone: NomeIcone;
  cor: string;
  alerta?: boolean;
  href: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{ backgroundImage: `linear-gradient(150deg, color-mix(in oklab, ${corAssunto} 10%, var(--cartao)), var(--cartao) 60%)` }}
      className="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-borda bg-cartao p-4 break-words transition-opacity hover:opacity-85">
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-sm font-medium text-texto-2">{rotulo}</span>
        <Selo icone={icone} cor={corAssunto} />
      </span>
      <span className={clsx('text-xl font-bold sm:text-2xl', alerta && 'text-alerta')}>{quebravel(valor)}</span>
      {children}
    </Link>
  );
}

/** Pictograma do pasto: um boizinho por cabeça; com muitos animais, cada ícone vale várias cabeças. */
const MAX_ICONES = 20;
function Cabecas({ n }: { n: number }) {
  if (n === 0) return <p className="text-sm font-medium text-texto-2">Pasto vazio agora.</p>;
  const porIcone = Math.ceil(n / MAX_ICONES);
  return (
    <div className="flex flex-col gap-1">
      <div aria-hidden="true" className="flex flex-wrap gap-0.5" style={{ color: cor(6) }}>
        {Array.from({ length: Math.ceil(n / porIcone) }, (_, i) => (
          <Icone key={i} nome="rebanho" className="size-5" />
        ))}
      </div>
      {porIcone > 1 && <p className="text-xs font-medium text-texto-2">Cada ícone ≈ {porIcone} cabeças</p>}
    </div>
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
  const gmdDe = (lista: typeof ativos) => lista.map((a) => evolucaoPeso(a, pesagens).gmd).filter((g): g is number => g !== null);
  const gmds = gmdDe(ativos);
  const gmdMedio = media(gmds);
  const baixos = estoque.filter((e) => e.saldo < e.minimo);
  const manejos = proximosManejos(sanidade, somarDias(hoje, 7));
  const atrasados = manejos.filter((s) => s.proxima_data! < hoje);
  const brucelose = pendentesBrucelose(animais, sanidade, hoje).length;

  // Por lote: cabeças e ganho médio (pastos e gráfico de ganho)
  const porLote = lotes.map((l) => {
    const doLote = ativos.filter((a) => a.lote_id === l.id);
    return { lote: l, cabecas: doLote.length, gmd: media(gmdDe(doLote)) };
  });
  const ganhoPorLote = porLote.filter((p) => p.gmd !== null).map((p) => ({ nome: p.lote.nome, valor: p.gmd!, texto: kgDia(p.gmd!) }));

  // Gastos por categoria
  const gastos12 = despesas.filter((d) => d.data >= `${meses[0]}-01`);
  const porCategoria = (Object.keys(CATEGORIAS) as Categoria[]).map((c) => {
    const v = gastos12.filter((d) => d.categoria === c).reduce((s, d) => s + d.valor, 0);
    return { nome: CATEGORIAS[c], valor: v, texto: reaisCurto(v) };
  });

  // Composição do rebanho por raça: as 5 maiores + "Outras" (no máximo 6 partes)
  const porRaca = Object.entries(ativos.reduce<Record<string, number>>((acc, a) => ({ ...acc, [a.raca || 'Sem raça']: (acc[a.raca || 'Sem raça'] ?? 0) + 1 }), {}))
    .sort((a, b) => b[1] - a[1])
    .map(([nome, valor]) => ({ nome, valor }));
  const racas = porRaca.length > 6 ? [...porRaca.slice(0, 5), { nome: 'Outras', valor: porRaca.slice(5).reduce((s, p) => s + p.valor, 0) }] : porRaca;

  const agora = new Date();
  const hora = agora.getHours();
  const saudacao = hora >= 5 && hora < 12 ? 'Bom dia' : hora >= 12 && hora < 18 ? 'Boa tarde' : 'Boa noite';
  const dataHoje = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const machos = ativos.filter((a) => a.sexo === 'M').length;

  return (
    <Tela>
      {/* ---------- Topo: saudação e o tamanho do rebanho ---------- */}
      <section className="flex flex-col gap-4 rounded-2xl border border-borda bg-cartao p-4 sm:p-5">
        {/* Celular: saudação em cima do número. Tablet e computador: lado a lado, para o topo ficar mais baixo. */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
          <div className="min-w-0">
            <p className="text-2xl font-bold">{saudacao}</p>
            <p className="font-medium text-texto-2">{dataHoje.charAt(0).toUpperCase() + dataHoje.slice(1)}</p>
            {modoExemplo() && <p className="text-sm font-medium text-texto-2">Dados de exemplo: o que você lançar some ao recarregar a página.</p>}
          </div>
          <div className="flex shrink-0 flex-wrap items-end gap-x-4 gap-y-1 border-t border-borda pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-6">
            <span className="text-6xl leading-none font-bold tracking-tight">{numero(ativos.length)}</span>
            <span className="flex flex-col pb-1">
              <span className="font-bold">{ativos.length === 1 ? 'cabeça no rebanho' : 'cabeças no rebanho'}</span>
              <Variacao valor={variacao(ativos.length, cabecasAntes)} subirEhBom referencia={`vs ${numero(cabecasAntes)} há um ano`} />
            </span>
          </div>
        </div>
        <ul className="flex flex-wrap gap-2 text-sm font-semibold">
          {[
            `${numero(lotes.length)} ${lotes.length === 1 ? 'pasto' : 'pastos'}`,
            `${numero(machos)} ${machos === 1 ? 'macho' : 'machos'}`,
            `${numero(ativos.length - machos)} ${ativos.length - machos === 1 ? 'fêmea' : 'fêmeas'}`,
            gmdMedio !== null && `ganhando ${kgDia(gmdMedio)}`,
          ]
            .filter(Boolean)
            .map((t) => (
              <li key={t as string} className="rounded-full bg-selecionado px-3 py-1">
                {t}
              </li>
            ))}
        </ul>
      </section>

      {/* ---------- Indicadores ---------- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Vendas em 12 meses" valor={reaisCurto(totalVendas)} icone="vendas" cor={cor(1)} href="/relatorios">
          <span className="text-sm font-medium text-texto-2">{numero(saidasComValor.filter((a) => a.saida_data! >= `${meses[0]}-01`).length)} animais vendidos</span>
          <Tendencia valores={vendasMes} rotulo="Vendas por mês nos últimos 12 meses" corSerie={cor(1)} />
        </Indicador>
        <Indicador rotulo="Gastos do mês" valor={reaisCurto(gastosMes[ultimoMes])} icone="financeiro" cor={cor(2)} href="/financeiro">
          <Variacao valor={variacao(gastosMes[ultimoMes], gastosMes[ultimoMes - 1])} subirEhBom={false} referencia="vs mês passado" />
          <Tendencia valores={gastosMes} rotulo="Gastos por mês nos últimos 12 meses" corSerie={cor(2)} />
        </Indicador>
        <Indicador rotulo="Ganho médio de peso" valor={gmdMedio === null ? '—' : kgDia(gmdMedio)} icone="peso" cor={cor(3)} href="/rebanho">
          <span className="text-sm font-medium text-texto-2">{numero(gmds.length)} animais pesados</span>
        </Indicador>
        <Indicador rotulo="Custo por cabeça no mês" valor={reaisCurto(custoCabecaMes[ultimoMes - 1])} icone="relatorios" cor={cor(2)} href="/relatorios">
          <span className="text-sm font-medium text-texto-2">{nomeMes(meses[ultimoMes - 1])}</span>
          <Tendencia valores={custoCabecaMes.slice(0, -1)} rotulo="Custo por cabeça por mês" corSerie={cor(2)} />
        </Indicador>
        <Indicador rotulo="Resultado em 12 meses" valor={reaisCurto(resultado)} icone="vendas" cor={resultado < 0 ? RUIM : BOM} alerta={resultado < 0} href="/relatorios">
          <span className="text-sm font-medium text-texto-2">vendas − compras de animais − gastos</span>
        </Indicador>
        <Indicador rotulo="Compra de animais" valor={reaisCurto(totalCompras)} icone="rebanho" cor={cor(5)} href="/rebanho">
          <span className="text-sm font-medium text-texto-2">
            {numero(animais.filter((a) => a.entrada_tipo === 'compra' && a.entrada_data >= `${meses[0]}-01`).length)} animais em 12 meses
          </span>
        </Indicador>
        <Indicador rotulo="Sanidade atrasada" valor={numero(atrasados.length)} icone="sanidade" cor={atrasados.length ? RUIM : BOM} alerta={atrasados.length > 0} href="/sanidade">
          <span className="text-sm font-medium text-texto-2">
            {numero(manejos.length - atrasados.length)} para esta semana
            {brucelose > 0 && ` · ${numero(brucelose)} ${brucelose === 1 ? 'bezerra' : 'bezerras'} para brucelose`}
          </span>
        </Indicador>
        <Indicador
          rotulo="Estoque baixo"
          valor={numero(baixos.length)}
          icone={baixos.length ? 'alerta' : 'estoque'}
          cor={baixos.length ? RUIM : BOM}
          alerta={baixos.length > 0}
          href="/alimentacao">
          <span className="text-sm font-medium text-texto-2">{baixos.length ? baixos.map((b) => b.nome).join(', ') : 'tudo em ordem'}</span>
        </Indicador>
      </div>

      {/* ---------- O que pede atenção (antes dos gráficos: é o que dá para resolver hoje) ---------- */}
      {manejos.length > 0 || baixos.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {manejos.length > 0 && (
            <CartaoGrafico
              titulo="Sanidade nesta semana"
              icone="sanidade"
              cor={atrasados.length ? RUIM : 'var(--primaria)'}
              acao={<Link href="/sanidade" className="text-sm font-bold whitespace-nowrap text-texto-2 hover:opacity-80">Ver tudo ›</Link>}>
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
            <CartaoGrafico
              titulo="Repor estoque"
              icone="estoque"
              cor={RUIM}
              acao={<Link href="/alimentacao" className="text-sm font-bold whitespace-nowrap text-texto-2 hover:opacity-80">Ver tudo ›</Link>}>
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
      ) : (
        <div className="flex items-center gap-4 rounded-2xl border border-borda bg-cartao p-4">
          <Selo icone="ok" cor={BOM} />
          <div>
            <p className="font-bold">Tudo em dia</p>
            <p className="text-sm font-medium text-texto-2">Nenhuma vacina ou remédio para esta semana e nenhum insumo abaixo do mínimo.</p>
          </div>
        </div>
      )}

      {/* ---------- Pastos: um cartão por lote, com o gado desenhado ---------- */}
      {porLote.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-bold">Pastos</h2>
            <Link href="/rebanho" className="text-sm font-bold text-texto-2 hover:opacity-80">
              Ver rebanho ›
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {porLote.map(({ lote, cabecas, gmd }) => (
              <Link
                key={lote.id}
                href={`/rebanho?lote=${lote.id}`}
                title={`Ver os animais de ${lote.nome}`}
                className="flex min-w-0 flex-col gap-3 rounded-2xl border border-borda bg-cartao p-4 break-words transition-opacity hover:opacity-85">
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-bold">{lote.nome}</span>
                    <span className="block text-sm font-medium text-texto-2">{gmd === null ? 'sem pesagem ainda' : `ganhando ${kgDia(gmd)}`}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="text-2xl font-bold">{numero(cabecas)}</span> <span className="text-sm font-medium text-texto-2">cab.</span>
                  </span>
                </span>
                <Cabecas n={cabecas} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------- Gráficos ---------- */}
      <CartaoGrafico titulo="Vendas × gastos por mês" subtitulo="Últimos 12 meses. A compra de animais fica de fora (está em Relatórios)." icone="vendas" cor={cor(1)}>
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
          formatarEixo={numeroCurto}
        />
        <TabelaDados colunas={['Mês', 'Vendas', 'Gastos']} linhas={meses.map((m, i) => [titulos[i], reais(vendasMes[i]), reais(gastosMes[i])])} />
      </CartaoGrafico>

      <div className="grid gap-6 lg:grid-cols-2">
        <CartaoGrafico titulo="Evolução do rebanho" subtitulo="Cabeças no fim de cada mês" icone="rebanho" cor={cor(6)}>
          <Area rotulos={rotulos} titulos={titulos} valores={cabecasMes} nome="Cabeças no fim do mês" corSerie={cor(6)} formatar={(v) => `${numero(v)} cab.`} formatarEixo={numero} altura={150} />
        </CartaoGrafico>
        <CartaoGrafico titulo="Rebanho por raça" subtitulo={`${numero(ativos.length)} cabeças ativas`} icone="rebanho">
          <Segmentada partes={racas} unidade="cab." />
        </CartaoGrafico>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CartaoGrafico titulo="Gastos por categoria" subtitulo={`Últimos 12 meses · total ${reais(totalGastos)}`} icone="financeiro" cor={cor(2)}>
          <BarrasDeitadas itens={porCategoria} corSerie={cor(2)} />
        </CartaoGrafico>
        <CartaoGrafico titulo="Ganho de peso por lote" subtitulo="Média dos animais ativos, desde a entrada" icone="peso" cor={cor(3)}>
          <BarrasDeitadas itens={ganhoPorLote} corSerie={cor(3)} />
        </CartaoGrafico>
      </div>

      <CartaoGrafico titulo="Custo por cabeça" subtitulo="Gastos do mês ÷ cabeças no fim do mês" icone="relatorios" cor={cor(2)}>
        <Area rotulos={rotulos.slice(0, -1)} titulos={titulos.slice(0, -1)} valores={custoCabecaMes.slice(0, -1)} nome="Custo por cabeça" corSerie={cor(2)} formatar={reais} formatarEixo={numeroCurto} altura={150} />
      </CartaoGrafico>
    </Tela>
  );
}
