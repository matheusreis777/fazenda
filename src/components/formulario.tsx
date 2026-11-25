'use client';

import clsx from 'clsx';
import { type FormEvent, useEffect, useState } from 'react';

import { Botao, CAMPO, Chip } from '@/components/ui';
import { hojeIso, num } from '@/lib/formato';

export type Campo = {
  chave: string;
  rotulo: string;
  /**
   * texto (padrão), numero (> 0, aceita vírgula), data (seletor do navegador; valor 'AAAA-MM-DD', começa em hoje),
   * opcoes (escolha única) ou senha.
   */
  tipo?: 'texto' | 'numero' | 'data' | 'opcoes' | 'senha' | 'email';
  opcoes?: { valor: string; rotulo: string }[];
  opcional?: boolean;
  dica?: string;
  /** Para senhas: 'current-password' na senha atual (o padrão é 'new-password'). */
  autoComplete?: string;
  /** Se informado, o campo só aparece (e só é validado) quando devolver true. */
  quando?: (valores: Valores) => boolean;
};

export type Valores = Record<string, string>;
/** Texto = mensagem de erro; vazio = deu certo. */
type Resultado = string | null | void;

function erroDoCampo(campo: Campo, valor: string): string | null {
  if (!valor.trim()) return campo.opcional ? null : 'Preencha este campo.';
  if (campo.tipo === 'numero' && !(num(valor) > 0)) return 'Informe um número maior que zero.';
  if (campo.tipo === 'data' && !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return 'Escolha uma data.';
  return null;
}

/**
 * Formulário em janela: os campos vêm de uma lista, então todo cadastro e toda edição usam este componente.
 * Monte só enquanto estiver aberto ({aberto && <Formulario … />}) para começar sempre limpo.
 * - `iniciais`: valores já preenchidos (edição).
 * - `validar`: mensagem para regras que dependem de mais de um campo (ou null se estiver tudo certo).
 * - `onSalvar` / `onExcluir`: podem ser assíncronos; se devolverem um texto, é o erro a mostrar e a janela fica aberta.
 * - `onExcluir` mostra o botão Excluir, que pede confirmação num segundo clique.
 */
export function Formulario({
  titulo,
  campos,
  iniciais,
  validar,
  onSalvar,
  onExcluir,
  onFechar,
}: {
  titulo: string;
  campos: Campo[];
  iniciais?: Valores | false | null;
  validar?: (valores: Valores) => string | null;
  onSalvar: (valores: Valores) => Resultado | Promise<Resultado>;
  onExcluir?: (() => Resultado | Promise<Resultado>) | false | null;
  onFechar: () => void;
}) {
  const [valores, setValores] = useState<Valores>(() => ({
    ...Object.fromEntries(
      // Data obrigatória começa em hoje; data opcional começa em branco.
      campos.map((c) => [c.chave, c.tipo === 'data' && !c.opcional ? hojeIso() : c.tipo === 'opcoes' ? (c.opcoes?.[0]?.valor ?? '') : '']),
    ),
    ...iniciais,
  }));
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  // Esc fecha a janela.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [onFechar]);

  const mudar = (chave: string, valor: string) => {
    setValores((v) => ({ ...v, [chave]: valor }));
    setErroGeral(null);
    setConfirmandoExclusao(false);
  };

  const visiveis = campos.filter((c) => !c.quando || c.quando(valores));

  /** Roda a gravação; fecha se deu certo, mostra o erro se não. Um clique por vez. */
  async function executar(acao: () => Resultado | Promise<Resultado>) {
    if (ocupado) return;
    setOcupado(true);
    let erro: string | null;
    try {
      erro = (await acao()) ?? null;
    } catch {
      erro = 'Não foi possível concluir. Confira a conexão e tente de novo.';
    }
    setOcupado(false);
    if (erro) {
      setErroGeral(erro);
      setConfirmandoExclusao(false);
      return;
    }
    onFechar();
  }

  function salvar(e: FormEvent) {
    e.preventDefault();
    setTentouSalvar(true);
    if (visiveis.some((c) => erroDoCampo(c, valores[c.chave]))) return;
    const erro = validar?.(valores) ?? null;
    setErroGeral(erro);
    if (erro) return;
    void executar(() => onSalvar(valores));
  }

  function excluir() {
    if (!confirmandoExclusao) return setConfirmandoExclusao(true);
    if (onExcluir) void executar(onExcluir);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-6">
      <button type="button" aria-label="Fechar formulário" tabIndex={-1} onClick={onFechar} className="absolute inset-0 cursor-default" />
      <form
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        noValidate
        onSubmit={salvar}
        className="relative flex max-h-[90dvh] w-full flex-col gap-4 rounded-t-3xl border border-borda bg-cartao p-6 sm:max-w-md sm:rounded-3xl">
        <h2 className="text-xl font-bold break-words">{titulo}</h2>

        <div className="-mx-1 flex flex-col gap-4 overflow-y-auto px-1">
          {visiveis.map((c) => {
            const erro = tentouSalvar ? erroDoCampo(c, valores[c.chave]) : null;
            const id = `campo-${c.chave}`;
            return (
              <div key={c.chave} className="flex flex-col gap-1.5">
                <label htmlFor={c.tipo === 'opcoes' ? undefined : id} id={`${id}-rotulo`} className="text-sm font-bold">
                  {c.rotulo}
                  {c.opcional && <span className="font-medium text-texto-2"> (opcional)</span>}
                </label>
                {c.tipo === 'opcoes' ? (
                  <div role="radiogroup" aria-labelledby={`${id}-rotulo`} className="flex flex-wrap gap-2">
                    {c.opcoes?.map((o) => (
                      <Chip key={o.valor} titulo={o.rotulo} ativo={valores[c.chave] === o.valor} onClick={() => mudar(c.chave, o.valor)} />
                    ))}
                  </div>
                ) : (
                  <input
                    id={id}
                    className={clsx(CAMPO, erro && 'border-alerta')}
                    type={c.tipo === 'data' ? 'date' : c.tipo === 'senha' ? 'password' : c.tipo === 'email' ? 'email' : 'text'}
                    inputMode={c.tipo === 'numero' ? 'decimal' : undefined}
                    autoComplete={c.autoComplete ?? (c.tipo === 'senha' ? 'new-password' : 'off')}
                    autoCapitalize={c.tipo === 'senha' || c.tipo === 'email' ? 'none' : undefined}
                    placeholder={c.dica}
                    value={valores[c.chave]}
                    onChange={(e) => mudar(c.chave, e.target.value)}
                  />
                )}
                {erro && <p className="text-sm font-medium text-alerta">{erro}</p>}
              </div>
            );
          })}
        </div>

        {erroGeral && (
          <p role="alert" className="text-sm font-medium text-alerta">
            {erroGeral}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          {onExcluir && (
            <button type="button" onClick={excluir} className="mr-auto cursor-pointer py-2 text-sm font-bold text-alerta hover:opacity-80">
              {confirmandoExclusao ? 'Confirmar exclusão' : 'Excluir'}
            </button>
          )}
          <Botao titulo="Cancelar" secundario onClick={onFechar} />
          <Botao titulo={ocupado ? 'Salvando…' : 'Salvar'} tipo="submit" desabilitado={ocupado} />
        </div>
      </form>
    </div>
  );
}
