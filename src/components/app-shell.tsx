'use client';

import type { Session } from '@supabase/supabase-js';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState, useSyncExternalStore } from 'react';

import { Formulario } from '@/components/formulario';
import { Login } from '@/components/login';
import { Avisos, Botao, Girando, Icone, type NomeIcone } from '@/components/ui';
import { carregar, ligarBanco } from '@/lib/banco';
import { SENHA_MINIMA, trocarSenha } from '@/lib/conta';
import { BASE_VAZIA, definir, useDados } from '@/lib/dados';
import { supabase, supabaseConfigurado } from '@/lib/supabase';
import { alternarTema, useEscuro } from '@/lib/tema';

// Com as chaves no .env o app grava no Supabase e exige login; sem elas roda com dados de exemplo.
if (supabaseConfigurado) ligarBanco();

const ABAS: { href: string; titulo: string; icone: NomeIcone; soDesenvolvedor?: boolean }[] = [
  { href: '/', titulo: 'Início', icone: 'inicio' },
  { href: '/rebanho', titulo: 'Rebanho', icone: 'rebanho' },
  { href: '/alimentacao', titulo: 'Alimentação', icone: 'alimentacao' },
  { href: '/financeiro', titulo: 'Financeiro', icone: 'financeiro' },
  { href: '/sanidade', titulo: 'Sanidade', icone: 'sanidade' },
  { href: '/equipe', titulo: 'Equipe e máquinas', icone: 'equipe' },
  { href: '/relatorios', titulo: 'Relatórios', icone: 'relatorios' },
  // Esconder a aba é só conveniência: a permissão de verdade é conferida no servidor (supabase/functions/admin).
  { href: '/desenvolvedor', titulo: 'Desenvolvedor', icone: 'dev', soDesenvolvedor: true },
];

const semAssinatura = () => () => {};

function Centro({ children }: { children: ReactNode }) {
  return <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">{children}</main>;
}

/** Moldura do app: decide entre login, avisos e as telas, e desenha o menu (lateral no computador, embaixo no celular). */
export function AppShell({ children }: { children: ReactNode }) {
  const caminho = usePathname();
  const escuro = useEscuro();
  const { carregado, erro, pendente, admin } = useDados();
  // O app depende do navegador (sessão, tema, data de hoje): só desenha depois de montar, para o HTML
  // do servidor e o do navegador não divergirem.
  const montado = useSyncExternalStore(semAssinatura, () => true, () => false);

  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [maisAberto, setMaisAberto] = useState(false);
  const [saindo, setSaindo] = useState(false);

  // undefined = ainda lendo a sessão salva; null = sem login.
  const [sessao, setSessao] = useState<Session | null | undefined>(supabaseConfigurado ? undefined : null);
  useEffect(() => {
    if (!supabaseConfigurado) return;
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessao(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // Lê os dados ao entrar e esvazia ao sair. Fica fora do onAuthStateChange porque o Supabase
  // não recomenda chamar o próprio cliente de dentro daquele callback.
  const logado = !!sessao;
  useEffect(() => {
    if (!supabaseConfigurado) return;
    if (logado) void carregar();
    else definir(BASE_VAZIA, { carregado: false, erro: null });
  }, [logado]);

  if (!montado) return null;

  // Devolve a promessa: o Botao mostra a rodinha até terminar.
  const sair = () => {
    setSaindo(true);
    return supabase.auth.signOut().finally(() => setSaindo(false));
  };

  if (supabaseConfigurado) {
    if (sessao === undefined) return null;
    if (!sessao) return <Login />;
    if (!carregado) {
      return (
        <Centro>
          <p role="status" className="flex items-center gap-3 font-medium text-texto-2">
            <Girando className="size-6" />
            Carregando os dados da fazenda…
          </p>
        </Centro>
      );
    }
    if (pendente) {
      return (
        <Centro>
          <h1 className="text-xl font-bold">Conta aguardando aprovação</h1>
          <p className="max-w-md font-medium text-texto-2">
            Sua conta ({sessao.user.email}) foi criada, mas ainda não tem acesso aos dados da fazenda. Peça ao responsável
            para aprovar e depois clique em “Verificar de novo”.
          </p>
          <Botao titulo="Verificar de novo" onClick={carregar} />
          <Botao titulo="Sair" secundario onClick={sair} />
        </Centro>
      );
    }
    if (erro) {
      return (
        <Centro>
          <p className="max-w-md font-medium">{erro}</p>
          <Botao titulo="Tentar de novo" onClick={carregar} />
          <Botao titulo="Sair" secundario onClick={sair} />
        </Centro>
      );
    }
  }

  const abas = ABAS.filter((a) => !a.soDesenvolvedor || admin);
  const atual = ABAS.find((a) => a.href === caminho);
  // Celular: as 4 primeiras ficam na barra; o resto vai para o botão "Mais".
  const naBarra = abas.slice(0, 4);
  const noMais = abas.slice(4);
  const maisAtivo = noMais.some((a) => a.href === caminho);

  return (
    <div className="flex h-dvh flex-col md:flex-row print:block print:h-auto">
      {/* Computador e tablet deitado: menu na lateral */}
      <nav aria-label="Menu" className="hidden w-56 shrink-0 flex-col gap-1 border-r border-borda bg-cartao p-3 md:flex print:hidden">
        <span className="px-3 py-2 text-lg font-bold">Fazenda</span>
        {abas.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            aria-current={a.href === caminho ? 'page' : undefined}
            className={clsx(
              'flex items-center gap-3 rounded-xl px-3 py-2 font-semibold transition-colors',
              a.href === caminho ? 'bg-primaria-suave text-primaria' : 'text-texto-2 hover:bg-primaria-suave',
            )}>
            <Icone nome={a.icone} />
            {a.titulo}
          </Link>
        ))}
      </nav>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-borda bg-cartao px-4 print:hidden">
          <h1 className="truncate text-xl font-bold">{atual?.titulo ?? 'Fazenda'}</h1>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={alternarTema}
              aria-label={escuro ? 'Usar tema claro' : 'Usar tema escuro'}
              className="cursor-pointer text-texto-2 hover:opacity-80">
              <Icone nome={escuro ? 'sol' : 'lua'} className="size-[22px]" />
            </button>
            {supabaseConfigurado && (
              <>
                {/* No celular, "Trocar senha" fica no menu "Mais" para o cabeçalho caber. */}
                <button
                  type="button"
                  onClick={() => setTrocandoSenha(true)}
                  className="hidden cursor-pointer text-sm font-bold text-texto-2 hover:opacity-80 md:inline">
                  Trocar senha
                </button>
                <button
                  type="button"
                  onClick={() => void sair()}
                  disabled={saindo}
                  aria-busy={saindo || undefined}
                  className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-texto-2 hover:opacity-80 disabled:cursor-wait">
                  {saindo && <Girando />}
                  {saindo ? 'Saindo…' : 'Sair'}
                </button>
              </>
            )}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto print:overflow-visible">{children}</main>

        {/* Celular: abas embaixo */}
        <nav aria-label="Menu" className="flex shrink-0 border-t border-borda bg-cartao pb-[env(safe-area-inset-bottom)] md:hidden print:hidden">
          {naBarra.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              aria-current={a.href === caminho ? 'page' : undefined}
              className={clsx(
                'flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold',
                a.href === caminho ? 'text-primaria' : 'text-texto-2',
              )}>
              <Icone nome={a.icone} className="size-6" />
              <span className="max-w-full truncate px-1">{a.titulo}</span>
            </Link>
          ))}
          <button
            type="button"
            aria-expanded={maisAberto}
            onClick={() => setMaisAberto(!maisAberto)}
            className={clsx(
              'flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-0.5 py-2 text-[11px] font-semibold',
              maisAtivo || maisAberto ? 'text-primaria' : 'text-texto-2',
            )}>
            <Icone nome="mais" className="size-6" />
            <span>Mais</span>
          </button>
        </nav>
      </div>

      {maisAberto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label="Fechar menu" tabIndex={-1} onClick={() => setMaisAberto(false)} className="absolute inset-0 bg-black/45" />
          <nav aria-label="Mais telas" className="absolute inset-x-0 bottom-0 flex flex-col gap-1 rounded-t-3xl border border-borda bg-cartao p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {noMais.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                onClick={() => setMaisAberto(false)}
                aria-current={a.href === caminho ? 'page' : undefined}
                className={clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-3 font-semibold',
                  a.href === caminho ? 'bg-primaria-suave text-primaria' : 'text-texto',
                )}>
                <Icone nome={a.icone} />
                {a.titulo}
              </Link>
            ))}
            {supabaseConfigurado && (
              <button
                type="button"
                onClick={() => (setMaisAberto(false), setTrocandoSenha(true))}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left font-semibold">
                <span className="size-5" aria-hidden="true" />
                Trocar senha
              </button>
            )}
          </nav>
        </div>
      )}

      {trocandoSenha && sessao && (
        <Formulario
          titulo="Trocar senha"
          campos={[
            { chave: 'atual', rotulo: 'Senha atual', tipo: 'senha', autoComplete: 'current-password' },
            { chave: 'nova', rotulo: 'Nova senha', tipo: 'senha', ajuda: `Pelo menos ${SENHA_MINIMA} letras ou números.` },
            { chave: 'repetir', rotulo: 'Repita a nova senha', tipo: 'senha' },
          ]}
          validar={(v) => {
            if (v.nova.length < SENHA_MINIMA) return `A nova senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
            if (v.nova !== v.repetir) return 'As duas senhas novas não são iguais.';
            return null;
          }}
          onSalvar={(v) => trocarSenha(v.atual, v.nova)}
          salvarTexto="Trocar senha"
          sucesso="Senha trocada."
          onFechar={() => setTrocandoSenha(false)}
        />
      )}
      <Avisos />
    </div>
  );
}
