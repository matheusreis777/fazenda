'use client';

import type { User } from '@supabase/supabase-js';
import clsx from 'clsx';
import { useEffect, useState } from 'react';

import { Formulario } from '@/components/formulario';
import { Etiqueta, Linha, Opcoes, Secao, Tela } from '@/components/ui';
import { salvarNome, SENHA_MINIMA, trocarSenha } from '@/lib/conta';
import { salvar, useDados } from '@/lib/dados';
import { supabase, supabaseConfigurado } from '@/lib/supabase';
import { type Cor, CORES, escolherCor, escolherTema, useCor, useTema } from '@/lib/tema';

/** Dados da fazenda (a empresa desta conta), a conta de quem está logado (nome e senha) e as preferências deste aparelho. */
export default function Perfil() {
  const { admin, nomeFazenda } = useDados();
  const tema = useTema();
  const cor = useCor();
  const [usuario, setUsuario] = useState<User | null>(null);
  const [form, setForm] = useState<'fazenda' | 'nome' | 'senha' | null>(null);

  // Recebe a sessão atual e, depois de salvar o nome, a conta já atualizada (evento USER_UPDATED).
  useEffect(() => {
    if (!supabaseConfigurado) return;
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setUsuario(s?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const nome: string = usuario?.user_metadata?.nome ?? '';
  const email = usuario?.email ?? '';

  return (
    <Tela>
      {/* ---------- Quem está usando ---------- */}
      <div className="flex items-center gap-4 rounded-2xl border border-borda bg-cartao p-4">
        <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primaria-suave text-2xl font-bold text-primaria">
          {(nome || email || 'F').charAt(0).toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-col items-start gap-1">
          <h2 className="max-w-full truncate text-xl font-bold">{supabaseConfigurado ? nome || 'Sem nome' : 'Modo de exemplo'}</h2>
          <p className="max-w-full truncate text-sm font-medium text-texto-2">
            {supabaseConfigurado ? email : 'Sem login: o que você lançar vale só até recarregar a página.'}
          </p>
          {admin && <Etiqueta texto="Desenvolvedor" />}
        </div>
      </div>

      <Secao titulo="Fazenda" descricao="Cada conta tem a própria fazenda, com dados separados.">
        <Linha titulo="Nome da fazenda" subtitulo={nomeFazenda || 'Ainda sem nome'} onClick={() => setForm('fazenda')} dicaAcao="Mudar o nome da fazenda" />
      </Secao>

      {supabaseConfigurado && (
        <Secao titulo="Sua conta">
          <Linha titulo="Nome" subtitulo={nome || 'Ainda sem nome'} onClick={() => setForm('nome')} dicaAcao="Mudar o nome" />
          <Linha titulo="Trocar senha" subtitulo="Pede a senha atual antes, por segurança" onClick={() => setForm('senha')} dicaAcao="Trocar a senha" />
        </Secao>
      )}

      <Secao titulo="Aparência" descricao="Vale só para este aparelho.">
        <div className="flex flex-col gap-2 py-3">
          <div>
            <h3 className="font-semibold">Tema</h3>
            <p className="text-sm font-medium text-texto-2">Automático segue o tema do celular ou computador.</p>
          </div>
          <Opcoes
            rotulo="Tema"
            opcoes={[
              { valor: 'sistema', rotulo: 'Automático' },
              { valor: 'light', rotulo: 'Claro' },
              { valor: 'dark', rotulo: 'Escuro' },
            ]}
            valor={tema}
            onMudar={escolherTema}
          />
        </div>
        <div className="flex flex-col gap-2 py-3">
          <div>
            <h3 className="font-semibold">Cor</h3>
            <p className="text-sm font-medium text-texto-2">Dos botões, do menu e dos destaques.</p>
          </div>
          <div role="radiogroup" aria-label="Cor" className="flex flex-wrap gap-2">
            {(Object.keys(CORES) as Cor[]).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={cor === c}
                onClick={() => escolherCor(c)}
                className={clsx(
                  'flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-1.5 text-sm font-medium transition-opacity hover:opacity-80',
                  cor === c ? 'border-primaria font-bold ring-1 ring-primaria' : 'border-borda',
                )}>
                {/* data-cor na amostra pinta só ela com a cor da opção (ver globals.css) */}
                <span data-cor={c} aria-hidden="true" className="size-4 rounded-full bg-primaria" />
                {CORES[c]}
              </button>
            ))}
          </div>
        </div>
      </Secao>

      {form === 'fazenda' && (
        <Formulario
          titulo="Nome da fazenda"
          descricao="Aparece no menu, nas certidões dos animais e nos relatórios impressos."
          campos={[{ chave: 'nome', rotulo: 'Nome', dica: 'Ex.: Fazenda Santa Luzia' }]}
          iniciais={{ nome: nomeFazenda }}
          // Mesmo limite do banco (check em 0005_fazenda.sql).
          validar={(v) => (v.nome.trim().length > 80 ? 'Use no máximo 80 letras.' : null)}
          onSalvar={(v) => salvar('fazenda', { id: 1, nome: v.nome.trim() })}
          sucesso="Nome da fazenda salvo."
          onFechar={() => setForm(null)}
        />
      )}

      {form === 'nome' && (
        <Formulario
          titulo="Seu nome"
          descricao="Aparece aqui no perfil."
          campos={[{ chave: 'nome', rotulo: 'Nome', dica: 'Ex.: João da Silva' }]}
          iniciais={{ nome }}
          onSalvar={(v) => salvarNome(v.nome.trim())}
          sucesso="Nome salvo."
          onFechar={() => setForm(null)}
        />
      )}

      {form === 'senha' && (
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
          onFechar={() => setForm(null)}
        />
      )}
    </Tela>
  );
}
