'use client';

import clsx from 'clsx';
import Link from 'next/link';
import type { ReactNode } from 'react';

// Componentes de interface feitos à mão. As cores vêm da paleta em src/app/globals.css.

const ICONES = {
  inicio: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  rebanho: (
    <>
      <circle cx="6.5" cy="10" r="1.8" />
      <circle cx="10" cy="6" r="1.8" />
      <circle cx="14" cy="6" r="1.8" />
      <circle cx="17.5" cy="10" r="1.8" />
      <path d="M12 11c-2.5 0-5 2.6-5 5.2 0 1.6 1.2 2.6 2.7 2.6.9 0 1.5-.4 2.3-.4s1.4.4 2.3.4c1.5 0 2.7-1 2.7-2.6 0-2.6-2.5-5.2-5-5.2z" />
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

/** Linha de cartões que quebra sozinha conforme a largura. */
export function Grade({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">{children}</div>;
}

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
  const classe = 'flex flex-col gap-0.5 rounded-2xl border border-borda bg-cartao p-4 text-left';
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
      <span className={clsx('text-xl font-bold', alerta && 'text-alerta')}>{valor}</span>
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
export function Secao({ titulo, acao, children }: { titulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex min-h-9 items-center justify-between gap-2">
        <h2 className="text-[17px] font-bold">{titulo}</h2>
        {acao}
      </div>
      {/* divide-y desenha a linha só entre os itens */}
      <div className="divide-y divide-borda overflow-hidden rounded-2xl border border-borda bg-cartao px-4">{children}</div>
    </section>
  );
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
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold">{titulo}</span>
        {subtitulo && <span className="text-sm font-medium text-texto-2">{subtitulo}</span>}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5">
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

export function Botao({
  titulo,
  onClick,
  secundario,
  rotuloAcessivel,
  tipo = 'button',
  desabilitado,
  className,
}: {
  titulo: string;
  onClick?: () => void;
  secundario?: boolean;
  /** Para botões cujo texto é só um símbolo (‹ ›). */
  rotuloAcessivel?: string;
  tipo?: 'button' | 'submit';
  desabilitado?: boolean;
  className?: string;
}) {
  return (
    <button
      type={tipo}
      onClick={onClick}
      disabled={desabilitado}
      aria-label={rotuloAcessivel}
      className={clsx(
        'cursor-pointer rounded-full px-4 py-2 text-sm font-bold whitespace-nowrap transition-opacity hover:opacity-80 disabled:cursor-default disabled:opacity-50',
        secundario ? 'bg-selecionado text-texto' : 'bg-primaria text-sobre-primaria',
        className,
      )}>
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
      className={clsx(
        'cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-opacity hover:opacity-80',
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

/** Classe dos campos de texto, compartilhada entre formulário, busca e login. */
export const CAMPO = 'w-full rounded-xl border border-borda bg-fundo px-4 py-3 text-base text-texto placeholder:text-texto-2 outline-none focus:border-primaria';
