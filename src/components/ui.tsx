'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useState, useSyncExternalStore } from 'react';

// Componentes de interface feitos à mão. As cores vêm da paleta em src/app/globals.css.

const ICONES = {
  inicio: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  // Cabeça de boi: chifres, orelhas e focinho.
  rebanho: (
    <>
      <path d="M7.5 7h9l-.6 6.2-1.4 6.2a1.6 1.6 0 0 1-1.6 1.3h-1.8a1.6 1.6 0 0 1-1.6-1.3L8.1 13.2z" />
      <path d="M7.5 7C5.6 6.6 4.4 5.2 4.2 3.4M16.5 7c1.9-.4 3.1-1.8 3.3-3.6" />
      <path d="M7.9 9.4 3.6 8.6c.3 1.6 1.7 2.6 4.4 2.6M16.1 9.4l4.3-.8c-.3 1.6-1.7 2.6-4.4 2.6" />
      <path d="M10.6 17.6h.01M13.4 17.6h.01" />
    </>
  ),
  peso: <path d="M12 4v16M6 20h12M5 8h14M7 8l-3 6a3 3 0 0 0 6 0zm10 0-3 6a3 3 0 0 0 6 0z" />,
  ok: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.8 2.8L16 10" />
    </>
  ),
  alimentacao: <path d="M12 21v-8m0 0c0-4 3-7 8-7 0 5-3 8-8 7zm0 2c0-3-2-5-7-5 0 4 3 6 7 5z" />,
  financeiro: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  vendas: <path d="m3 17 6-6 4 4 8-8m-6 0h6v6" />,
  estoque: <path d="m3 8 9-5 9 5v8l-9 5-9-5zm0 0 9 5 9-5m-9 5v8" />,
  alerta: <path d="M12 4 2.5 20h19zm0 6v4m0 3.5v.5" />,
  buscar: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.5-4.5" />
    </>
  ),
  sol: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4m-14.2 0 1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  lua: <path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z" />,
  dev: <path d="m8 8-4 4 4 4m8-8 4 4-4 4M13.5 5l-3 14" />,
  sanidade: <path d="m18 2 4 4m-6-2 4 4M14 6 6 14l-1 5 5-1 8-8M9 11l4 4M3 21l3-3" />,
  equipe: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.3c1.8.8 3 2.9 3 5.7" />
    </>
  ),
  relatorios: <path d="M4 20V10m6 10V4m6 16v-7m5 7H3" />,
  perfil: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </>
  ),
  mais: (
    <>
      <circle cx="5" cy="12" r="1.3" />
      <circle cx="12" cy="12" r="1.3" />
      <circle cx="19" cy="12" r="1.3" />
    </>
  ),
};
export type NomeIcone = keyof typeof ICONES;

export function Icone({ nome, className }: { nome: NomeIcone; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={clsx('size-5 shrink-0', className)}>
      {ICONES[nome]}
    </svg>
  );
}

/** Conteúdo de uma tela: largura máxima centralizada (celular, tablet e computador). */
export function Tela({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 pb-10">{children}</div>;
}

// ---------------------------------------------------------------------------------------------
// Layout das telas de cadastro (o padrão do Rebanho):
//   Topo (busca + botão principal + resumo) → Grupos de cartões que abrem listas → "Mais" (Secao de Linhas).
//   Dentro de uma lista: Trilha (Rebanho › Pasto da Sede + título) → Grade de números → Secao com a lista.

/** Topo fixo da tela: busca e botão principal lado a lado, com uma linha de resumo embaixo. */
export function Topo({
  busca,
  onBusca,
  dica,
  numerico,
  novo,
  rotuloNovo,
  onNovo,
  children,
}: {
  busca: string;
  onBusca: (v: string) => void;
  dica: string;
  numerico?: boolean;
  /** Texto curto do botão principal (ex.: "+ Animal"). */
  novo: string;
  /** O que o botão faz, por extenso (ex.: "Cadastrar animal"). */
  rotuloNovo: string;
  onNovo: () => void;
  /** Resumo em uma linha (ex.: "320 cabeças em 4 lotes"). */
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Busca valor={busca} onMudar={onBusca} numerico={numerico} dica={dica} />
        <Botao titulo={novo} rotuloAcessivel={rotuloNovo} onClick={onNovo} className="px-5 text-base" />
      </div>
      {children && <p className="text-sm font-medium text-texto-2">{children}</p>}
    </div>
  );
}

/** Grade de cartões grandes (um por lote, insumo, categoria…), com um "+ Novo" tracejado opcional no fim. */
export function Grupos({ titulo, vazio, novo, onNovo, children }: { titulo: string; vazio?: string | false; novo?: string; onNovo?: () => void; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[17px] font-bold">{titulo}</h2>
      {vazio && <p className="text-sm font-medium text-texto-2">{vazio}</p>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {children}
        {novo && (
          <button
            type="button"
            onClick={onNovo}
            className="flex min-h-28 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-borda p-4 text-base font-bold text-texto-2 transition-colors hover:border-texto-2 hover:text-texto">
            {novo}
          </button>
        )}
      </div>
    </section>
  );
}

/** Cartão de um grupo: nome, número grande e linhas de detalhe. Tocar abre a lista do grupo. */
export function CartaoGrupo({
  titulo,
  valor,
  unidade,
  detalhes = [],
  alerta,
  onClick,
}: {
  titulo: string;
  valor: string;
  unidade?: string;
  detalhes?: (string | false | null | undefined)[];
  alerta?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex min-w-0 cursor-pointer flex-col gap-1 rounded-2xl border bg-cartao p-4 text-left transition-colors hover:border-texto-2',
        alerta ? 'border-alerta/50' : 'border-borda',
      )}>
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-[17px] font-bold">{titulo}</span>
        <span aria-hidden="true" className="text-xl text-texto-2">
          ›
        </span>
      </span>
      <span className={clsx('flex flex-wrap items-baseline gap-x-1.5 text-2xl font-bold tabular-nums sm:text-3xl', alerta && 'text-alerta')}>
        {valor}
        {unidade && <span className="text-base font-medium text-texto-2">{unidade}</span>}
      </span>
      {detalhes.filter(Boolean).map((d) => (
        <span key={d as string} className="text-sm font-medium text-texto-2">
          {d}
        </span>
      ))}
    </button>
  );
}

/**
 * Sub-tela aberta de uma seção, guardada no endereço: /rebanho?lote=3, /rebanho?saidas. Assim o voltar do
 * celular volta um nível, recarregar mantém a sub-tela e a aba do menu (sem nada depois do ?) volta ao início.
 * `vistas` são os nomes aceitos; qualquer outra coisa no endereço vale como início (ver = null).
 * `aoMudar` roda sempre que a sub-tela muda, venha de onde vier (toque, voltar, menu): é onde a tela limpa
 * a busca e os filtros.
 */
export function useVista<V extends string>(vistas: readonly V[], aoMudar: () => void) {
  const params = useSearchParams();
  const ver = vistas.find((v) => params.has(v)) ?? null;
  const id = ver ? params.get(ver) : null;
  // Ajuste durante a renderização (mesmo padrão da usePaginacao).
  const chave = `${ver}=${id}`;
  const [anterior, setAnterior] = useState(chave);
  if (chave !== anterior) {
    setAnterior(chave);
    aoMudar();
  }
  /** Abre a sub-tela; sem argumentos, volta ao início. Entra no histórico, então o voltar do celular desfaz. */
  const abrir = (v?: V, novoId?: number | string) => {
    const url = v ? `?${v}${novoId === undefined ? '' : `=${encodeURIComponent(novoId)}`}` : window.location.pathname;
    window.history.pushState(null, '', url);
  };
  return { ver, id, abrir };
}

/**
 * Começo de uma lista aberta: a trilha "Rebanho › Pasto da Sede" (tocar no primeiro volta) e, se tiver,
 * título com ação ao lado (ex.: "Editar lote"). `aqui` é o nome na trilha; sem ele, vale o título.
 */
export function Trilha({
  raiz,
  onVoltar,
  aqui,
  titulo,
  descricao,
  acao,
}: {
  raiz: string;
  onVoltar: () => void;
  aqui?: string;
  titulo?: string;
  descricao?: string | null;
  acao?: ReactNode;
}) {
  return (
    <>
      <nav aria-label="Você está em" className="print:hidden">
        <ol className="flex flex-wrap items-center gap-x-2 text-base font-semibold">
          <li className="flex items-center gap-2">
            <button type="button" onClick={onVoltar} className="cursor-pointer py-1.5 text-texto-2 underline underline-offset-4 hover:text-texto">
              {raiz}
            </button>
            <span aria-hidden="true" className="text-texto-2">
              ›
            </span>
          </li>
          <li aria-current="page" className="min-w-0 truncate py-1.5">
            {aqui ?? titulo}
          </li>
        </ol>
      </nav>
      {titulo && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold">{titulo}</h2>
            {descricao && <p className="text-sm font-medium text-texto-2">{descricao}</p>}
          </div>
          {acao}
        </div>
      )}
    </>
  );
}

/** Linha de cartões que quebra sozinha conforme a largura (celular pequeno: um por linha, para o valor caber). */
export function Grade({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3">{children}</div>;
}

/**
 * Valores do Intl ("R$ 1.234,56", "12 mil") vêm com espaço que não quebra. Nos cartões estreitos do celular,
 * trocar por espaço comum deixa o número descer para a linha de baixo em vez de estourar o cartão.
 */
export const quebravel = (texto: string) => texto.replace(/ /g, ' ');

/** Cartão de número-resumo. Com `href` vira atalho para a tela do assunto. */
export function Cartao({
  rotulo,
  valor,
  detalhe,
  icone,
  alerta,
  href,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  icone?: NomeIcone;
  alerta?: boolean;
  href?: string;
}) {
  const classe = 'flex min-w-0 flex-col gap-0.5 rounded-2xl border border-borda bg-cartao p-4 text-left break-words';
  const conteudo = (
    <>
      <div className="flex min-h-8 items-center justify-between gap-2">
        <span className="text-sm font-medium text-texto-2">{rotulo}</span>
        {icone && (
          <span
            className={clsx(
              'flex size-8 shrink-0 items-center justify-center rounded-full',
              alerta ? 'bg-alerta-suave text-alerta' : 'bg-primaria-suave text-primaria',
            )}>
            <Icone nome={icone} className="size-[18px]" />
          </span>
        )}
      </div>
      <span className={clsx('text-xl font-bold', alerta && 'text-alerta')}>{quebravel(valor)}</span>
      {detalhe && <span className="text-sm font-medium text-texto-2">{detalhe}</span>}
    </>
  );
  return href ? (
    <Link href={href} className={clsx(classe, 'transition-opacity hover:opacity-80')}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}

/** Bloco com título, ação opcional à direita e conteúdo num cartão. */
export function Secao({
  titulo,
  descricao,
  acao,
  filtros,
  rodape,
  children,
}: {
  titulo: string;
  /** Uma frase curta dizendo o que dá para fazer nesta lista. */
  descricao?: string;
  acao?: ReactNode;
  /** Busca e/ou opções de filtro, entre o título e a lista. */
  filtros?: ReactNode;
  rodape?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-[17px] font-bold">{titulo}</h2>
          {descricao && <p className="text-sm font-medium text-texto-2">{descricao}</p>}
        </div>
        {acao}
      </div>
      {filtros && <div className="flex flex-col gap-2">{filtros}</div>}
      {/* divide-y desenha a linha só entre os itens */}
      <div className="divide-y divide-borda overflow-hidden rounded-2xl border border-borda bg-cartao px-4">{children}</div>
      {rodape}
    </section>
  );
}

/** Itens por página nas listas. */
export const POR_PAGINA = 15;

/**
 * Paginação de uma lista já carregada: devolve só os itens da página atual e os controles para pôr no
 * `rodape` da Secao. Quando `filtro` muda (busca, lote, mês…), volta para a primeira página.
 */
export function usePaginacao<T>(itens: T[], filtro: unknown = null, porPagina = POR_PAGINA) {
  const [pagina, setPagina] = useState(1);
  const chave = JSON.stringify(filtro);
  const [chaveAnterior, setChaveAnterior] = useState(chave);
  if (chave !== chaveAnterior) {
    // Ajuste durante a renderização (padrão do React para "resetar estado quando uma prop muda").
    setChaveAnterior(chave);
    setPagina(1);
  }
  const total = Math.max(Math.ceil(itens.length / porPagina), 1);
  // Se a lista encolheu (ex.: exclusão do último item da última página), fica na última que existe.
  const atual = Math.min(pagina, total);
  const inicio = (atual - 1) * porPagina;
  const controles =
    itens.length > porPagina ? (
      <nav aria-label="Paginação" className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-texto-2 tabular-nums">
          {inicio + 1}–{Math.min(inicio + porPagina, itens.length)} de {itens.length}
        </span>
        <span className="flex items-center gap-2">
          <Botao titulo="‹ Anterior" secundario desabilitado={atual === 1} onClick={() => setPagina(atual - 1)} />
          <span className="min-w-16 text-center font-semibold tabular-nums" aria-live="polite">
            {atual} / {total}
          </span>
          <Botao titulo="Próxima ›" secundario desabilitado={atual === total} onClick={() => setPagina(atual + 1)} />
        </span>
      </nav>
    ) : null;
  return { itens: itens.slice(inicio, inicio + porPagina), controles };
}

/** Etiqueta pequena de estado (ex.: "Baixo", "Vendido"). */
export function Etiqueta({ texto, tom = 'neutro' }: { texto: string; tom?: 'neutro' | 'alerta' | 'ok' }) {
  return (
    <span
      className={clsx(
        'rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap',
        tom === 'alerta' && 'bg-alerta-suave text-alerta',
        tom === 'ok' && 'bg-primaria-suave text-primaria',
        tom === 'neutro' && 'bg-selecionado text-texto-2',
      )}>
      {texto}
    </span>
  );
}

/** Linha de lista: marca opcional à esquerda, título + subtítulo, valor e etiqueta à direita. Com onClick vira botão. */
export function Linha({
  marca,
  titulo,
  subtitulo,
  valor,
  etiqueta,
  alerta,
  apagada,
  onClick,
  dicaAcao,
}: {
  marca?: string;
  titulo: string;
  subtitulo?: string;
  valor?: string;
  etiqueta?: ReactNode;
  alerta?: boolean;
  apagada?: boolean;
  onClick?: () => void;
  /** Diz ao leitor de tela o que o clique faz. */
  dicaAcao?: string;
}) {
  const conteudo = (
    <>
      {marca && (
        <span className="flex h-9 min-w-13 shrink-0 items-center justify-center rounded-lg bg-primaria-suave px-2 text-sm font-bold text-primaria">
          {marca}
        </span>
      )}
      {/* Título e valor dividem o aperto (flex-auto): no celular os dois quebram linha em vez de um esmagar o outro.
          O valor só encolhe até o maior pedaço que não quebra (ex.: "R$ 1.500,00"), então dinheiro não parte no meio. */}
      <span className="flex min-w-0 flex-auto flex-col break-words">
        <span className="font-semibold">{titulo}</span>
        {subtitulo && <span className="text-sm font-medium text-texto-2">{subtitulo}</span>}
      </span>
      <span className="flex flex-col items-end gap-0.5 text-right">
        {valor && <span className={clsx('text-[15px] font-bold', alerta && 'text-alerta')}>{valor}</span>}
        {etiqueta}
      </span>
      {onClick && (
        <span aria-hidden="true" className="text-xl text-texto-2">
          ›
        </span>
      )}
    </>
  );
  const classe = clsx('flex w-full items-center gap-3 py-3 text-left', apagada && 'opacity-55');
  return onClick ? (
    <button type="button" onClick={onClick} title={dicaAcao} className={clsx(classe, 'cursor-pointer transition-opacity hover:opacity-70')}>
      {conteudo}
    </button>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}

/** Aviso de lista vazia, para usar dentro de uma Secao. */
export function Vazio({ children }: { children: ReactNode }) {
  return <p className="py-4 font-medium text-texto-2">{children}</p>;
}

/** Barra horizontal proporcional (0 a 1) com rótulo e valor. */
export function Barra({ rotulo, valor, fracao }: { rotulo: string; valor: string; fracao: number }) {
  return (
    <div className="flex flex-col gap-1.5 py-2.5">
      <div className="flex justify-between gap-2 text-sm">
        <span className="font-medium">{rotulo}</span>
        <span className="font-bold">{valor}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-selecionado">
        <div className="h-full rounded-full bg-primaria" style={{ width: `${Math.round(fracao * 100)}%` }} />
      </div>
    </div>
  );
}

/** Rodinha de "processando". Herda a cor do texto ao redor. */
export function Girando({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={clsx('inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent', className)}
    />
  );
}

export function Botao({
  titulo,
  onClick,
  secundario,
  rotuloAcessivel,
  tipo = 'button',
  desabilitado,
  carregando,
  className,
}: {
  titulo: string;
  /** Se devolver uma promessa (ex.: uma chamada ao banco), o botão mostra a rodinha e fica travado até ela terminar. */
  onClick?: () => unknown;
  secundario?: boolean;
  /** Para botões cujo texto é só um símbolo (‹ ›). */
  rotuloAcessivel?: string;
  tipo?: 'button' | 'submit';
  desabilitado?: boolean;
  /** Rodinha + botão travado, para quando o "processando" é controlado de fora (ex.: o enviar do formulário). */
  carregando?: boolean;
  className?: string;
}) {
  const [rodando, setRodando] = useState(false);
  const ocupado = carregando || rodando;
  function clicar() {
    const resultado = onClick?.();
    if (resultado instanceof Promise) {
      setRodando(true);
      void resultado.finally(() => setRodando(false));
    }
  }
  return (
    <button
      type={tipo}
      onClick={clicar}
      disabled={desabilitado || ocupado}
      aria-busy={ocupado || undefined}
      aria-label={rotuloAcessivel}
      className={clsx(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold whitespace-nowrap transition-opacity hover:opacity-80',
        ocupado ? 'disabled:cursor-wait disabled:opacity-75' : 'disabled:cursor-default disabled:opacity-50',
        secundario ? 'bg-selecionado text-texto' : 'bg-primaria text-sobre-primaria',
        className,
      )}>
      {ocupado && <Girando />}
      {titulo}
    </button>
  );
}

/** Filtro em forma de pílula. */
export function Chip({ titulo, ativo, onClick }: { titulo: string; ativo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      // shrink-0: na faixa que rola não espreme; max-w-full: nome comprido (ex.: insumo no formulário) quebra linha em vez de estourar.
      className={clsx(
        'max-w-full shrink-0 cursor-pointer rounded-lg border px-4 py-1.5 text-sm font-medium break-words transition-opacity hover:opacity-80',
        ativo ? 'border-primaria bg-primaria text-sobre-primaria' : 'border-borda bg-cartao text-texto',
      )}>
      {titulo}
    </button>
  );
}

/** Filtros numa faixa só, que rola para o lado quando não cabem. */
export function Chips({ children }: { children: ReactNode }) {
  return <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">{children}</div>;
}

/** Grupo de filtros de escolha única (ex.: Todos · Machos · Fêmeas). O valor '' costuma ser "todos". */
export function Opcoes<T extends string>({
  rotulo,
  opcoes,
  valor,
  onMudar,
}: {
  rotulo: string;
  opcoes: { valor: T; rotulo: string }[];
  valor: T;
  onMudar: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={rotulo}>
      <Chips>
        {opcoes.map((o) => (
          <Chip key={o.valor} titulo={o.rotulo} ativo={valor === o.valor} onClick={() => onMudar(o.valor)} />
        ))}
      </Chips>
    </div>
  );
}

/** Campo de busca com lupa. */
export function Busca({ valor, onMudar, dica, numerico }: { valor: string; onMudar: (v: string) => void; dica: string; numerico?: boolean }) {
  return (
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">{dica}</span>
      <Icone nome="buscar" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-texto-2" />
      <input
        type="search"
        className={`${CAMPO} rounded-2xl bg-cartao pl-12`}
        placeholder={dica}
        inputMode={numerico ? 'numeric' : undefined}
        value={valor}
        onChange={(e) => onMudar(e.target.value)}
      />
    </label>
  );
}

/** Busca sem diferenciar maiúsculas nem acentos: contem('Ração Engorda', 'racao') → true. */
export function contem(texto: string | null | undefined, termo: string) {
  const limpar = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
  return limpar(texto ?? '').includes(limpar(termo));
}

/** Classe dos campos de texto, compartilhada entre formulário, busca e login. */
export const CAMPO = 'w-full rounded-xl border border-borda bg-fundo px-4 py-3 text-base text-texto placeholder:text-texto-2 outline-none focus:border-primaria';

// ---------------------------------------------------------------------------------------------
// Avisos rápidos ("Animal cadastrado.") que aparecem embaixo da tela e somem sozinhos.

type Aviso = { id: number; texto: string };
let avisos: Aviso[] = [];
const ouvintesAviso = new Set<() => void>();
let proximoAviso = 1;

/** Mostra um aviso de confirmação por alguns segundos. */
export function avisar(texto: string) {
  const id = proximoAviso++;
  avisos = [...avisos, { id, texto }];
  ouvintesAviso.forEach((f) => f());
  setTimeout(() => {
    avisos = avisos.filter((a) => a.id !== id);
    ouvintesAviso.forEach((f) => f());
  }, 4000);
}

/** Onde os avisos aparecem. Fica uma vez só, na moldura do app. */
export function Avisos() {
  const lista = useSyncExternalStore(
    (f) => {
      ouvintesAviso.add(f);
      return () => ouvintesAviso.delete(f);
    },
    () => avisos,
    () => avisos,
  );
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
      {lista.map((a) => (
        <span key={a.id} className="flex items-center gap-2 rounded-full bg-primaria px-5 py-3 text-sm font-bold text-sobre-primaria shadow-lg">
          <span aria-hidden="true">✓</span>
          {a.texto}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Janela base (menu de ações e confirmações). Embaixo no celular, no centro no computador.

/** Sem `onFechar` (ex.: enquanto grava), o × fica travado e o Esc não fecha. */
function Janela({ titulo, descricao, onFechar, children }: { titulo: string; descricao?: ReactNode; onFechar?: () => void; children: ReactNode }) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && onFechar?.();
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [onFechar]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="relative flex max-h-[90dvh] w-full flex-col gap-4 overflow-y-auto rounded-t-3xl border border-borda bg-cartao p-6 sm:max-w-md sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold break-words">{titulo}</h2>
            {descricao && <div className="mt-1 font-medium text-texto-2">{descricao}</div>}
          </div>
          <BotaoFechar onClick={onFechar} />
        </div>
        {children}
      </div>
    </div>
  );
}

/** Botão "✕" no canto das janelas. Sem `onClick` fica travado (janela gravando). */
export function BotaoFechar({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-label="Fechar"
      className="-mt-1 -mr-2 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-2xl leading-none text-texto-2 enabled:hover:bg-selecionado disabled:cursor-wait disabled:opacity-40">
      ×
    </button>
  );
}

export type Acao = {
  titulo: string;
  /** O que acontece ao escolher, em palavras simples. */
  descricao: string;
  onClick: () => void;
  /** Ação que apaga ou desfaz: aparece em vermelho e por último. */
  perigo?: boolean;
};

/** Menu com botões grandes, um por ação, cada um explicando o que faz. Aparece ao tocar num item da lista. */
export function MenuAcoes({ titulo, descricao, acoes, onFechar }: { titulo: string; descricao?: ReactNode; acoes: Acao[]; onFechar: () => void }) {
  return (
    <Janela titulo={titulo} descricao={descricao} onFechar={onFechar}>
      <ul className="flex flex-col gap-2">
        {acoes.map((a) => (
          <li key={a.titulo}>
            <button
              type="button"
              onClick={a.onClick}
              className={clsx(
                'flex w-full cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
                a.perigo ? 'border-alerta/30 hover:bg-alerta-suave' : 'border-borda hover:bg-selecionado',
              )}>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={clsx('font-bold', a.perigo && 'text-alerta')}>{a.titulo}</span>
                <span className="text-sm font-medium text-texto-2">{a.descricao}</span>
              </span>
              <span aria-hidden="true" className="text-xl text-texto-2">
                ›
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Janela>
  );
}

/** Pergunta "tem certeza?" antes de uma ação que não dá para desfazer. */
export function Confirmacao({
  titulo,
  texto,
  confirmar,
  perigo = true,
  sucesso,
  onConfirmar,
  onFechar,
}: {
  titulo: string;
  texto: ReactNode;
  /** Texto do botão, dizendo exatamente o que vai acontecer (ex.: "Excluir animal"). */
  confirmar: string;
  perigo?: boolean;
  /** Aviso mostrado depois que deu certo. */
  sucesso: string;
  /** Devolve null se deu certo ou a mensagem de erro. */
  onConfirmar: () => Promise<string | null> | string | null | void;
  onFechar: () => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  async function confirmarAgora() {
    if (ocupado) return;
    setOcupado(true);
    let falha: string | null;
    try {
      falha = (await onConfirmar()) ?? null;
    } catch {
      falha = 'Não foi possível concluir. Confira a conexão e tente de novo.';
    }
    setOcupado(false);
    if (falha) return setErro(falha);
    avisar(sucesso);
    onFechar();
  }
  return (
    <Janela titulo={titulo} onFechar={ocupado ? undefined : onFechar}>
      <div className="font-medium">{texto}</div>
      {erro && (
        <p role="alert" className="text-sm font-medium text-alerta">
          {erro}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Botao titulo="Voltar" secundario desabilitado={ocupado} onClick={onFechar} className="py-3" />
        <button
          type="button"
          disabled={ocupado}
          aria-busy={ocupado || undefined}
          onClick={() => void confirmarAgora()}
          className={clsx(
            'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold disabled:cursor-wait disabled:opacity-75',
            perigo ? 'bg-alerta text-white' : 'bg-primaria text-sobre-primaria',
          )}>
          {ocupado && <Girando />}
          {ocupado ? 'Aguarde…' : confirmar}
        </button>
      </div>
    </Janela>
  );
}
