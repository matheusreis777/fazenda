'use client';

// Gráficos feitos à mão em SVG/HTML, seguindo o guia de dataviz: traços finos, barras de no máximo 24px com
// a ponta arredondada, grade em linha fina, legenda quando há mais de uma série, dica ao passar o mouse
// (e ao focar pelo teclado) e uma tabela com os mesmos números para quem não lê o gráfico.
// As cores vêm de --serie-1… em src/app/globals.css, sempre na mesma ordem.

import clsx from 'clsx';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { Icone, type NomeIcone } from '@/components/ui';
import { marcasDoEixo } from '@/lib/painel';

/** Cor da série N (1 a 6), na ordem fixa da paleta. */
export const cor = (n: number) => `var(--serie-${n})`;

/** Largura atual de um elemento, atualizada quando a tela muda de tamanho. */
function useLargura<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [largura, setLargura] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const observador = new ResizeObserver(([e]) => setLargura(e.contentRect.width));
    observador.observe(ref.current);
    return () => observador.disconnect();
  }, []);
  return [ref, largura] as const;
}

/** Caixa da dica: o valor em destaque, o nome em segundo plano, com um traço da cor da série. */
function Dica({ x, titulo, linhas, largura }: { x: number; titulo: string; linhas: { cor: string; nome: string; valor: string }[]; largura: number }) {
  const LARGURA_DICA = 200;
  const esquerda = Math.min(Math.max(x - LARGURA_DICA / 2, 0), Math.max(largura - LARGURA_DICA, 0));
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-0 z-10 flex flex-col gap-1 rounded-xl border border-borda bg-cartao px-3 py-2 text-sm shadow-lg"
      style={{ left: esquerda, width: LARGURA_DICA }}>
      <span className="text-xs font-semibold text-texto-2">{titulo}</span>
      {linhas.map((l) => (
        <span key={l.nome} className="flex items-center gap-2">
          <span aria-hidden="true" className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: l.cor }} />
          <span className="font-bold">{l.valor}</span>
          <span className="truncate text-xs text-texto-2">{l.nome}</span>
        </span>
      ))}
    </div>
  );
}

/** Legenda acima do gráfico. `forma` imita a marca: quadrado para barras, traço para linhas. */
export function Legenda({ itens, forma = 'barra' }: { itens: { nome: string; cor: string }[]; forma?: 'barra' | 'linha' }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-texto-2">
      {itens.map((i) => (
        <li key={i.nome} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={clsx('shrink-0', forma === 'barra' ? 'size-2.5 rounded-[3px]' : 'h-0.5 w-3.5 rounded-full')} style={{ background: i.cor }} />
          {i.nome}
        </li>
      ))}
    </ul>
  );
}

/** Os números do gráfico numa tabela, recolhida por padrão. */
export function TabelaDados({ colunas, linhas }: { colunas: string[]; linhas: (string | number)[][] }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-semibold text-texto-2 hover:opacity-80">Ver em tabela</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left tabular-nums">
          <thead>
            <tr className="text-texto-2">
              {colunas.map((c, i) => (
                <th key={c} className={clsx('py-1 pr-4 font-semibold', i > 0 && 'text-right')}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={String(l[0])} className="border-t border-borda">
                {l.map((v, i) => (
                  <td key={i} className={clsx('py-1 pr-4', i > 0 && 'text-right')}>
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Retângulo com só o topo arredondado (raio 4), base reta na linha zero. */
function barra(x: number, y: number, largura: number, base: number): string {
  const altura = base - y;
  if (altura <= 0) return '';
  const r = Math.min(4, largura / 2, altura);
  return `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + largura - r}Q${x + largura},${y} ${x + largura},${y + r}V${base}Z`;
}

const MARGEM = { esquerda: 52, direita: 8, topo: 12, baixo: 26 };

/** Eixo Y com grade em linha fina; devolve a escala. */
function EixoY({ marcas, largura, altura, formatar }: { marcas: number[]; largura: number; altura: number; formatar: (v: number) => string }) {
  const teto = marcas[marcas.length - 1];
  const y = (v: number) => MARGEM.topo + altura - (v / teto) * altura;
  return (
    <g>
      {marcas.map((m) => (
        <g key={m}>
          <line x1={MARGEM.esquerda} x2={largura - MARGEM.direita} y1={y(m)} y2={y(m)} stroke={m === 0 ? 'var(--eixo)' : 'var(--grade)'} strokeWidth={1} />
          <text x={MARGEM.esquerda - 8} y={y(m)} dy="0.32em" textAnchor="end" className="fill-texto-2 text-[11px] tabular-nums">
            {formatar(m)}
          </text>
        </g>
      ))}
    </g>
  );
}

/** Rótulos do eixo X; pula alguns quando não cabem. */
function EixoX({ rotulos, centro, altura }: { rotulos: string[]; centro: (i: number) => number; altura: number }) {
  const espaco = rotulos.length > 1 ? centro(1) - centro(0) : 100;
  const pular = espaco < 30 ? 3 : espaco < 42 ? 2 : 1;
  return (
    <g>
      {rotulos.map((r, i) =>
        (rotulos.length - 1 - i) % pular === 0 ? (
          <text key={r} x={centro(i)} y={MARGEM.topo + altura + 18} textAnchor="middle" className="fill-texto-2 text-[11px]">
            {r}
          </text>
        ) : null,
      )}
    </g>
  );
}

export type Serie = { nome: string; cor: string; valores: number[] };

/** Colunas agrupadas: uma coluna por série em cada período (ex.: vendas × gastos por mês). */
export function Colunas({
  rotulos,
  titulos = rotulos,
  series,
  formatar,
  formatarEixo,
  altura = 200,
}: {
  rotulos: string[];
  /** Nome completo do período na dica (ex.: "novembro de 2026"). */
  titulos?: string[];
  series: Serie[];
  formatar: (v: number) => string;
  formatarEixo: (v: number) => string;
  altura?: number;
}) {
  const [ref, largura] = useLargura<HTMLDivElement>();
  const [ativo, setAtivo] = useState<number | null>(null);
  const marcas = marcasDoEixo(Math.max(...series.flatMap((s) => s.valores)), 4);
  const teto = marcas[marcas.length - 1];
  const area = Math.max(largura - MARGEM.esquerda - MARGEM.direita, 0);
  const faixa = area / rotulos.length;
  const ESPACO = 2;
  const larguraBarra = Math.max(Math.min(24, (faixa * 0.72 - ESPACO * (series.length - 1)) / series.length), 2);
  const grupo = larguraBarra * series.length + ESPACO * (series.length - 1);
  const centro = (i: number) => MARGEM.esquerda + faixa * i + faixa / 2;
  const base = MARGEM.topo + altura;
  const y = (v: number) => MARGEM.topo + altura - (v / teto) * altura;

  return (
    <div ref={ref} className="relative" onPointerLeave={() => setAtivo(null)}>
      {largura > 0 && (
        <svg width={largura} height={altura + MARGEM.topo + MARGEM.baixo} role="img" aria-label={`Gráfico de colunas: ${series.map((s) => s.nome).join(' e ')}`}>
          <EixoY marcas={marcas} largura={largura} altura={altura} formatar={formatarEixo} />
          {rotulos.map((r, i) => (
            <g key={r} opacity={ativo === null || ativo === i ? 1 : 0.45} className="transition-opacity">
              {series.map((s, k) => (
                <path key={s.nome} d={barra(centro(i) - grupo / 2 + k * (larguraBarra + ESPACO), y(s.valores[i]), larguraBarra, base)} fill={s.cor} />
              ))}
            </g>
          ))}
          <EixoX rotulos={rotulos} centro={centro} altura={altura} />
          {/* Faixa inteira do período é a área de toque: maior que a coluna. */}
          {rotulos.map((r, i) => (
            <rect
              key={r}
              x={MARGEM.esquerda + faixa * i}
              y={MARGEM.topo}
              width={faixa}
              height={altura}
              fill="transparent"
              tabIndex={0}
              aria-label={`${titulos[i]}: ${series.map((s) => `${s.nome} ${formatar(s.valores[i])}`).join(', ')}`}
              onPointerEnter={() => setAtivo(i)}
              onFocus={() => setAtivo(i)}
              onBlur={() => setAtivo(null)}
              className="outline-none"
            />
          ))}
        </svg>
      )}
      {ativo !== null && (
        <Dica
          x={centro(ativo)}
          largura={largura}
          titulo={titulos[ativo]}
          linhas={series.map((s) => ({ cor: s.cor, nome: s.nome, valor: formatar(s.valores[ativo]) }))}
        />
      )}
    </div>
  );
}

/** Linha com área suave: uma série ao longo do tempo, com mira que acompanha o mouse. */
export function Area({
  rotulos,
  titulos = rotulos,
  valores,
  nome,
  corSerie = cor(1),
  formatar,
  formatarEixo = formatar,
  altura = 180,
}: {
  rotulos: string[];
  titulos?: string[];
  valores: number[];
  nome: string;
  corSerie?: string;
  formatar: (v: number) => string;
  formatarEixo?: (v: number) => string;
  altura?: number;
}) {
  const [ref, largura] = useLargura<HTMLDivElement>();
  const [ativo, setAtivo] = useState<number | null>(null);
  const marcas = marcasDoEixo(Math.max(...valores), 4);
  const teto = marcas[marcas.length - 1];
  const area = Math.max(largura - MARGEM.esquerda - MARGEM.direita - 28, 0); // folga à direita para o rótulo final
  const passo = valores.length > 1 ? area / (valores.length - 1) : 0;
  const x = (i: number) => MARGEM.esquerda + 10 + passo * i;
  const y = (v: number) => MARGEM.topo + altura - (v / teto) * altura;
  const pontos = valores.map((v, i) => `${x(i)},${y(v)}`).join(' L');
  const ultimo = valores.length - 1;

  function mover(e: React.PointerEvent<SVGRectElement>) {
    const caixa = e.currentTarget.getBoundingClientRect();
    const i = Math.round((e.clientX - caixa.left - 10) / (passo || 1));
    setAtivo(Math.min(Math.max(i, 0), ultimo));
  }

  return (
    <div ref={ref} className="relative" onPointerLeave={() => setAtivo(null)}>
      {largura > 0 && valores.length > 0 && (
        <svg width={largura} height={altura + MARGEM.topo + MARGEM.baixo} role="img" aria-label={`Gráfico de linha: ${nome}`}>
          <EixoY marcas={marcas} largura={largura} altura={altura} formatar={formatarEixo} />
          <path d={`M${x(0)},${MARGEM.topo + altura} L${pontos} L${x(ultimo)},${MARGEM.topo + altura}Z`} fill={corSerie} opacity={0.1} />
          <path d={`M${pontos}`} fill="none" stroke={corSerie} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {ativo !== null && <line x1={x(ativo)} x2={x(ativo)} y1={MARGEM.topo} y2={MARGEM.topo + altura} stroke="var(--eixo)" strokeWidth={1} />}
          {/* Ponto final com anel da cor do cartão; rótulo só no último valor. */}
          <circle cx={x(ativo ?? ultimo)} cy={y(valores[ativo ?? ultimo])} r={4.5} fill={corSerie} stroke="var(--cartao)" strokeWidth={2} />
          {ativo === null && (
            <text x={x(ultimo)} y={y(valores[ultimo]) - 12} textAnchor="end" className="fill-texto text-[12px] font-bold">
              {formatar(valores[ultimo])}
            </text>
          )}
          <EixoX rotulos={rotulos} centro={x} altura={altura} />
          <rect
            x={MARGEM.esquerda}
            y={MARGEM.topo}
            width={area + 20}
            height={altura}
            fill="transparent"
            tabIndex={0}
            aria-label={`${nome}: último valor ${formatar(valores[ultimo])}. Use as setas para percorrer.`}
            onPointerMove={mover}
            onFocus={() => setAtivo(ultimo)}
            onBlur={() => setAtivo(null)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') setAtivo((a) => Math.max((a ?? ultimo) - 1, 0));
              if (e.key === 'ArrowRight') setAtivo((a) => Math.min((a ?? ultimo) + 1, ultimo));
            }}
            className="outline-none"
          />
        </svg>
      )}
      {ativo !== null && <Dica x={x(ativo)} largura={largura} titulo={titulos[ativo]} linhas={[{ cor: corSerie, nome, valor: formatar(valores[ativo]) }]} />}
    </div>
  );
}

/** Barras horizontais ordenadas, uma série (uma cor), valor na ponta de cada barra. */
export function BarrasDeitadas({ itens, corSerie = cor(1) }: { itens: { nome: string; valor: number; texto: string }[]; corSerie?: string }) {
  const ordenados = [...itens].sort((a, b) => b.valor - a.valor);
  const maior = Math.max(...ordenados.map((i) => i.valor), 0);
  if (ordenados.length === 0) return <p className="py-4 font-medium text-texto-2">Sem dados no período.</p>;
  return (
    <ul className="flex flex-col gap-2.5">
      {ordenados.map((i) => (
        <li key={i.nome} className="grid grid-cols-[minmax(0,6rem)_1fr] items-center gap-3 text-sm sm:grid-cols-[minmax(0,8.5rem)_1fr]" title={`${i.nome}: ${i.texto}`}>
          <span className="truncate font-medium">{i.nome}</span>
          <span className="flex min-w-0 items-center gap-2">
            {/* A barra maior ocupa o espaço que sobra depois de 6rem guardados para o valor (ex.: "R$ 123,4 mil"), então nada estoura no celular. */}
            <span
              className="h-5 shrink-0 rounded-r-[4px] transition-opacity hover:opacity-80"
              style={{ width: `calc((100% - 6rem) * ${maior ? Math.max(i.valor / maior, 0.005) : 0})`, background: corSerie }}
            />
            <span className="shrink-0 font-bold tabular-nums">{i.texto}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Barra segmentada alta (um todo dividido em partes, até 6): a fatia de cada parte aparece dentro dela quando cabe. */
export function Segmentada({ partes, unidade }: { partes: { nome: string; valor: number }[]; unidade: string }) {
  const [ref, largura] = useLargura<HTMLDivElement>();
  const total = partes.reduce((s, p) => s + p.valor, 0);
  const visiveis = partes.filter((p) => p.valor > 0);
  const [ativo, setAtivo] = useState<string | null>(null);
  if (total === 0) return <p className="py-4 font-medium text-texto-2">Sem dados.</p>;
  return (
    <div className="flex flex-col gap-3">
      <div ref={ref} className="flex h-7 gap-[2px]" role="img" aria-label={visiveis.map((p) => `${p.nome}: ${p.valor} ${unidade}`).join(', ')}>
        {visiveis.map((p) => {
          const i = partes.indexOf(p);
          const fatia = p.valor / total;
          const cabe = fatia * largura >= 44;
          return (
            <div
              key={p.nome}
              title={`${p.nome}: ${p.valor} ${unidade} (${Math.round(fatia * 100)}%)`}
              onPointerEnter={() => setAtivo(p.nome)}
              onPointerLeave={() => setAtivo(null)}
              className={clsx('flex items-center rounded-[4px] px-2 text-xs font-bold transition-opacity', ativo && ativo !== p.nome && 'opacity-50')}
              style={{ flexGrow: p.valor, flexBasis: 0, background: cor(i + 1), color: i === 3 ? '#0b0b0b' : '#ffffff' }}>
              {cabe && `${Math.round(fatia * 100)}%`}
            </div>
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {partes.map((p, i) => (
          <li key={p.nome} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ background: cor(i + 1) }} />
            <span className="text-texto-2">{p.nome}</span>
            <span className="font-semibold tabular-nums">{p.valor}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Mini-gráfico de tendência para os cartões: linha fina com área suave na cor do assunto, ponto no valor atual. */
export function Tendencia({ valores, rotulo, corSerie = 'var(--texto-2)' }: { valores: number[]; rotulo: string; corSerie?: string }) {
  if (valores.length < 2) return null;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const y = (v: number) => (max === min ? 15 : 27 - ((v - min) / (max - min)) * 24);
  const x = (i: number) => (i / (valores.length - 1)) * 100;
  const pontos = valores.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  return (
    <span className="relative block h-[30px] w-full" role="img" aria-label={rotulo}>
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
        <polygon points={`0,30 ${pontos} 100,30`} fill={corSerie} opacity={0.12} />
        <polyline points={pontos} fill="none" stroke={corSerie} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <span
        aria-hidden="true"
        className="absolute size-2 -translate-1/2 rounded-full ring-2 ring-cartao"
        style={{ left: '100%', top: `${(y(valores[valores.length - 1]) / 30) * 100}%`, background: corSerie }}
      />
    </span>
  );
}

/** Selo redondo com o ícone do assunto, tingido com a cor dele (o ícone escurece no claro e clareia no escuro, para aparecer bem). */
export function Selo({ icone, cor: corSelo, className }: { icone: NomeIcone; cor: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      style={{ background: `color-mix(in oklab, ${corSelo} 18%, var(--cartao))`, color: `color-mix(in oklab, ${corSelo} 78%, var(--texto))` }}
      className={clsx('flex size-9 shrink-0 items-center justify-center rounded-xl', className)}>
      <Icone nome={icone} className="size-5" />
    </span>
  );
}

/** Cartão branco de um gráfico: selo opcional, título, subtítulo, ação à direita e o conteúdo. */
export function CartaoGrafico({
  titulo,
  subtitulo,
  acao,
  icone,
  cor: corSelo = 'var(--primaria)',
  children,
  className,
}: {
  titulo: string;
  subtitulo?: string;
  acao?: ReactNode;
  icone?: NomeIcone;
  cor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx('flex min-w-0 flex-col gap-4 rounded-2xl border border-borda bg-cartao p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {icone && <Selo icone={icone} cor={corSelo} />}
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold">{titulo}</h2>
            {subtitulo && <p className="text-sm font-medium text-texto-2">{subtitulo}</p>}
          </div>
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}
