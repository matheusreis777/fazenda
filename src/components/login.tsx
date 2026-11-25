'use client';

import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Botao, CAMPO } from '@/components/ui';
import { supabase } from '@/lib/supabase';

// Mínimo padrão do Supabase; se mudar no painel (Authentication → Sign In / Providers), mudar aqui.
const SENHA_MINIMA = 6;

/** Mensagens para os erros de cadastro que a pessoa consegue resolver sozinha. */
const ERROS_DE_CADASTRO: Record<string, string> = {
  user_already_exists: 'Já existe uma conta com esse e-mail.',
  email_exists: 'Já existe uma conta com esse e-mail.',
  signup_disabled: 'O cadastro de novas contas está desativado.',
  weak_password: 'Senha fraca demais. Use uma senha mais longa.',
  email_address_invalid: 'Esse e-mail não é válido.',
  over_email_send_rate_limit: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.',
};

/**
 * Entrar ou criar conta. Depois de entrar, o AppShell troca esta tela pelo app sozinho.
 * Esta tela aparece em qualquer endereço; ao entrar, vai sempre para o Início (o painel).
 */
export function Login() {
  const router = useRouter();
  const [criando, setCriando] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  function trocarModo() {
    setCriando(!criando);
    setErro(null);
    setAviso(null);
    setConfirmacao('');
  }

  async function entrar() {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (!error) return router.replace('/');
    setErro(
      error.code === 'email_not_confirmed'
        ? 'Confirme seu e-mail pelo link que enviamos antes de entrar.'
        : 'Não foi possível entrar. Confira e-mail e senha.',
    );
  }

  async function criarConta() {
    if (senha.length < SENHA_MINIMA) return setErro(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
    if (senha !== confirmacao) return setErro('As duas senhas não são iguais.');
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: senha });
    if (error) return setErro(ERROS_DE_CADASTRO[error.code ?? ''] ?? `Não foi possível criar a conta: ${error.message}`);
    // Com confirmação de e-mail ligada no Supabase, a conta nasce sem sessão até a pessoa clicar no link.
    if (data.session) router.replace('/');
    else {
      setCriando(false);
      setSenha('');
      setConfirmacao('');
      setAviso('Conta criada. Abra o link de confirmação que enviamos ao seu e-mail e depois entre.');
    }
  }

  const pronto = !ocupado && !!email.trim() && !!senha && (!criando || !!confirmacao);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!pronto) return;
    setOcupado(true);
    setErro(null);
    setAviso(null);
    try {
      await (criando ? criarConta() : entrar());
    } catch {
      setErro('Sem conexão com o servidor. Tente de novo.');
    }
    setOcupado(false);
  }

  const campo = clsx(CAMPO, 'bg-cartao');

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <form onSubmit={enviar} noValidate className="flex w-full max-w-sm flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold">Fazenda</h1>
          <p className="font-medium text-texto-2">{criando ? 'Crie sua conta para começar.' : 'Entre para continuar.'}</p>
        </div>

        <input
          className={campo}
          type="email"
          placeholder="E-mail"
          aria-label="E-mail"
          autoComplete="email"
          autoCapitalize="none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className={campo}
          type="password"
          placeholder={criando ? `Senha (mínimo ${SENHA_MINIMA} caracteres)` : 'Senha'}
          aria-label="Senha"
          autoComplete={criando ? 'new-password' : 'current-password'}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        {criando && (
          <input
            className={campo}
            type="password"
            placeholder="Repita a senha"
            aria-label="Repita a senha"
            autoComplete="new-password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
          />
        )}

        {erro && (
          <p role="alert" className="font-medium text-alerta">
            {erro}
          </p>
        )}
        {aviso && <p className="font-medium">{aviso}</p>}

        <Botao
          tipo="submit"
          desabilitado={!pronto}
          carregando={ocupado}
          titulo={ocupado ? (criando ? 'Criando conta…' : 'Entrando…') : criando ? 'Criar conta' : 'Entrar'}
          className="rounded-xl py-3 text-base"
        />

        <button type="button" onClick={trocarModo} className="cursor-pointer self-center font-medium text-texto-2 hover:opacity-80">
          {criando ? 'Já tem conta? ' : 'Ainda não tem conta? '}
          <span className="font-bold text-texto">{criando ? 'Entrar' : 'Criar conta'}</span>
        </button>
      </form>
    </main>
  );
}
