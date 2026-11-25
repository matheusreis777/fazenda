'use client';

import clsx from 'clsx';
import { type FormEvent, useEffect, useState } from 'react';

import { avisar, Botao, BotaoFechar, CAMPO, Chip, Girando } from '@/components/ui';
import { arrobaParaKg, hojeIso, KG_POR_ARROBA, kgParaArroba, num, numParaTexto } from '@/lib/formato';

export type Campo = {
  chave: string;
  rotulo: string;
  /**
   * texto (padrão), numero (> 0, aceita vírgula), data (seletor do navegador; valor 'AAAA-MM-DD', começa em hoje),
   * opcoes (escolha única), varios (marcar vários das opções; ler o valor com `marcados`), senha,
   * ou peso (número com escolha entre kg e @; chega em `onSalvar` sempre em kg).
   */
  tipo?: 'texto' | 'numero' | 'data' | 'opcoes' | 'varios' | 'senha' | 'email' | 'peso';
  opcoes?: { valor: string; rotulo: string }[];
  opcional?: boolean;
  /** Exemplo dentro do campo vazio (some ao digitar). */
  dica?: string;
  /** Explicação curta embaixo do nome do campo, sempre visível: para que serve ou como preencher. */
  ajuda?: string;
  /** Para senhas: 'current-password' na senha atual (o padrão é 'new-password'). */
  autoComplete?: string;
  /** Se informado, o campo só aparece (e só é validado) quando devolver true. */
  quando?: (valores: Valores) => boolean;
  /**
   * Para campos de opções: um botão "+ Novo…" no fim da lista, que cria a opção ali mesmo sem sair do formulário
   * (ex.: criar um lote enquanto cadastra o animal). `criar` devolve o valor da opção nova, já escolhida em seguida.
   */
  novo?: { rotulo: string; dica?: string; criar: (nome: string) => Promise<{ valor: string } | { erro: string }> };
};

export type Valores = Record<string, string>;
/** Os valores marcados num campo `varios` (guardados no formulário separados por vírgula). */
export const marcados = (valor: string | undefined) => (valor ? valor.split(',') : []);
/** Texto = mensagem de erro; vazio = deu certo. */
type Resultado = string | null | void;

function erroDoCampo(campo: Campo, valor: string): string | null {
  if (!valor.trim()) {
    if (campo.opcional) return null;
    return campo.tipo === 'opcoes' ? 'Escolha uma opção.' : campo.tipo === 'varios' ? 'Marque pelo menos um.' : 'Este campo é obrigatório.';
  }
  if ((campo.tipo === 'numero' || campo.tipo === 'peso') && !(num(valor) > 0)) return 'Digite só números, maiores que zero (ex.: 250 ou 12,5).';
  if (campo.tipo === 'data' && !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return 'Escolha a data no calendário.';
  return null;
}

/**
 * Formulário em painel lateral (à direita; tela cheia no celular): os campos vêm de uma lista, então todo cadastro e toda edição usam este componente.
 * Monte só enquanto estiver aberto ({aberto && <Formulario … />}) para começar sempre limpo.
 * - `iniciais`: valores já preenchidos (edição).
 * - `validar`: mensagem para regras que dependem de mais de um campo (ou null se estiver tudo certo).
 * - `onSalvar` / `onExcluir`: podem ser assíncronos; se devolverem um texto, é o erro a mostrar e a janela fica aberta.
 * - `onExcluir` mostra o botão Excluir, que pede confirmação antes de apagar.
 * - `salvarTexto`: o que o botão principal faz (ex.: "Cadastrar animal"); `sucesso`: aviso mostrado depois.
 * Tocar fora da janela não fecha (para não perder o que foi digitado): só "Cancelar", o "×" ou a tecla Esc.
 */
export function Formulario({
  titulo,
  descricao,
  campos,
  iniciais,
  validar,
  onSalvar,
  onExcluir,
  onFechar,
  salvarTexto = 'Salvar',
  sucesso = 'Salvo.',
  excluirTexto = 'Excluir',
}: {
  titulo: string;
  /** Frase curta embaixo do título (ex.: "Último peso: 352 kg em 15/10"). */
  descricao?: string;
  campos: Campo[];
  salvarTexto?: string;
  sucesso?: string;
  excluirTexto?: string;
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
  /** O que está gravando agora: trava a janela inteira e mostra a rodinha no botão que foi tocado. */
  const [ocupado, setOcupado] = useState<'salvando' | 'excluindo' | null>(null);
  /** Unidade escolhida em cada campo de peso. Começa em kg (os valores iniciais vêm em kg). */
  const [unidades, setUnidades] = useState<Record<string, 'kg' | '@'>>({});
  const unidade = (chave: string) => unidades[chave] ?? 'kg';
  /** Campo de opções em que a pessoa está criando uma opção nova (nome digitado e erro, se houver). */
  const [criando, setCriando] = useState<{ chave: string; nome: string; erro: string | null; ocupado: boolean } | null>(null);

  async function criarOpcao(c: Campo) {
    if (!c.novo || !criando || criando.ocupado) return;
    setCriando({ ...criando, ocupado: true, erro: null });
    const r = await c.novo.criar(criando.nome);
    if ('erro' in r) return setCriando({ ...criando, ocupado: false, erro: r.erro });
    mudar(c.chave, r.valor);
    setCriando(null);
    const nome = c.novo.rotulo.replace(/^\+\s*(Novo|Nova)\s*/i, '');
    avisar(`${nome.charAt(0).toUpperCase()}${nome.slice(1)} criado e já escolhido.`);
  }

  /** Troca kg ↔ @ convertendo o que já foi digitado, para o número não mudar de sentido. */
  function trocarUnidade(chave: string, nova: 'kg' | '@') {
    if (unidade(chave) === nova) return;
    const atual = num(valores[chave] ?? '');
    if (atual > 0) {
      const convertido = nova === '@' ? kgParaArroba(atual) : arrobaParaKg(atual);
      mudar(chave, numParaTexto(Math.round(convertido * 10) / 10));
    }
    setUnidades((u) => ({ ...u, [chave]: nova }));
  }

  // Esc fecha a janela (menos no meio de uma gravação).
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !ocupado) onFechar();
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [onFechar, ocupado]);

  const mudar = (chave: string, valor: string) => {
    setValores((v) => ({ ...v, [chave]: valor }));
    setErroGeral(null);
    setConfirmandoExclusao(false);
  };

  const visiveis = campos.filter((c) => !c.quando || c.quando(valores));

  /** Roda a gravação; fecha se deu certo, mostra o erro se não. Um clique por vez. */
  async function executar(acao: () => Resultado | Promise<Resultado>, aviso: string, tipo: 'salvando' | 'excluindo') {
    if (ocupado) return;
    setOcupado(tipo);
    let erro: string | null;
    try {
      erro = (await acao()) ?? null;
    } catch {
      erro = 'Não foi possível concluir. Confira a conexão e tente de novo.';
    }
    setOcupado(null);
    if (erro) {
      setErroGeral(erro);
      setConfirmandoExclusao(false);
      return;
    }
    avisar(aviso);
    onFechar();
  }

  function salvar(e: FormEvent) {
    e.preventDefault();
    setTentouSalvar(true);
    if (visiveis.some((c) => erroDoCampo(c, valores[c.chave]))) return;
    const erro = validar?.(valores) ?? null;
    setErroGeral(erro);
    if (erro) return;
    // Pesos digitados em @ seguem para quem salva já convertidos em kg.
    const emKg = { ...valores };
    for (const c of visiveis) {
      if (c.tipo === 'peso' && unidade(c.chave) === '@' && valores[c.chave].trim()) {
        emKg[c.chave] = numParaTexto(Math.round(arrobaParaKg(num(valores[c.chave])) * 10) / 10);
      }
    }
    void executar(() => onSalvar(emKg), sucesso, 'salvando');
  }

  function excluir() {
    if (!confirmandoExclusao) return setConfirmandoExclusao(true);
    if (onExcluir) void executar(onExcluir, 'Excluído.', 'excluindo');
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45">
      <form
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        noValidate
        onSubmit={salvar}
        className="flex h-dvh w-full animate-gaveta flex-col border-l border-borda bg-cartao motion-reduce:animate-none sm:max-w-md">
        <div className="flex items-start justify-between gap-3 border-b border-borda px-6 py-5">
          <div className="min-w-0">
            <h2 className="text-xl font-bold break-words">{titulo}</h2>
            {descricao && <p className="mt-1 font-medium text-texto-2">{descricao}</p>}
          </div>
          <BotaoFechar onClick={ocupado ? undefined : onFechar} />
        </div>

        {/* fieldset desabilitado trava todos os campos de uma vez enquanto grava */}
        <fieldset disabled={!!ocupado} className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5 disabled:opacity-60">
          {visiveis.map((c) => {
            const erro = tentouSalvar ? erroDoCampo(c, valores[c.chave]) : null;
            const id = `campo-${c.chave}`;
            return (
              <div key={c.chave} className="flex flex-col gap-1.5">
                <label htmlFor={c.tipo === 'opcoes' || c.tipo === 'varios' ? undefined : id} id={`${id}-rotulo`} className="text-sm font-bold">
                  {c.rotulo}
                  {c.opcional ? <span className="font-medium text-texto-2"> (opcional)</span> : <span className="text-alerta"> *</span>}
                </label>
                {c.ajuda && <p className="-mt-1 text-sm font-medium text-texto-2">{c.ajuda}</p>}
                {c.tipo === 'peso' ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex gap-2">
                      <input
                        id={id}
                        className={clsx(CAMPO, 'min-w-0 flex-1', erro && 'border-alerta')}
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder={c.dica}
                        value={valores[c.chave]}
                        onChange={(e) => mudar(c.chave, e.target.value)}
                      />
                      <div role="radiogroup" aria-label="Unidade do peso" className="flex shrink-0 gap-1 rounded-xl bg-selecionado p-1">
                        {(['kg', '@'] as const).map((u) => (
                          <button
                            key={u}
                            type="button"
                            role="radio"
                            aria-checked={unidade(c.chave) === u}
                            aria-label={u === 'kg' ? 'quilos' : 'arrobas'}
                            onClick={() => trocarUnidade(c.chave, u)}
                            className={clsx(
                              'min-w-11 cursor-pointer rounded-lg px-3 text-base font-bold',
                              unidade(c.chave) === u ? 'bg-primaria text-sobre-primaria' : 'text-texto-2',
                            )}>
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>
                    {num(valores[c.chave] ?? '') > 0 && (
                      <p className="text-sm font-medium text-texto-2">
                        ={' '}
                        {unidade(c.chave) === '@'
                          ? `${(Math.round(arrobaParaKg(num(valores[c.chave])) * 10) / 10).toLocaleString('pt-BR')} kg`
                          : `${(Math.round(kgParaArroba(num(valores[c.chave])) * 10) / 10).toLocaleString('pt-BR')} @`}{' '}
                        (1 @ = {KG_POR_ARROBA} kg de peso vivo)
                      </p>
                    )}
                  </div>
                ) : c.tipo === 'varios' ? (
                  <Varios opcoes={c.opcoes ?? []} valor={valores[c.chave]} rotuloId={`${id}-rotulo`} onMudar={(v) => mudar(c.chave, v)} />
                ) : c.tipo === 'opcoes' ? (
                  <div className="flex flex-col gap-2">
                    <div role="radiogroup" aria-labelledby={`${id}-rotulo`} className="flex flex-wrap gap-2">
                      {c.opcoes?.map((o) => (
                        <Chip key={o.valor} titulo={o.rotulo} ativo={valores[c.chave] === o.valor} onClick={() => mudar(c.chave, o.valor)} />
                      ))}
                      {c.novo && criando?.chave !== c.chave && (
                        <button
                          type="button"
                          onClick={() => setCriando({ chave: c.chave, nome: '', erro: null, ocupado: false })}
                          className="cursor-pointer rounded-lg border border-dashed border-texto-2 px-4 py-1.5 text-sm font-bold whitespace-nowrap text-texto hover:bg-selecionado">
                          {c.novo.rotulo}
                        </button>
                      )}
                    </div>
                    {c.novo && criando?.chave === c.chave && (
                      <div className="flex flex-col gap-2 rounded-xl border border-borda bg-fundo p-3">
                        <label htmlFor={`${id}-novo`} className="text-sm font-bold">
                          Nome do {c.novo.rotulo.replace(/^\+\s*(Novo|Nova)\s*/i, '')}
                        </label>
                        <div className="flex gap-2">
                          <input
                            id={`${id}-novo`}
                            autoFocus
                            className={clsx(CAMPO, 'min-w-0 flex-1 bg-cartao')}
                            placeholder={c.novo.dica}
                            value={criando.nome}
                            onChange={(e) => setCriando({ ...criando, nome: e.target.value, erro: null })}
                            onKeyDown={(e) => {
                              // Enter cria a opção em vez de enviar o formulário inteiro.
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void criarOpcao(c);
                              }
                            }}
                          />
                          <Botao titulo={criando.ocupado ? 'Criando…' : 'Criar'} carregando={criando.ocupado} onClick={() => void criarOpcao(c)} />
                        </div>
                        {criando.erro && <p className="text-sm font-medium text-alerta">{criando.erro}</p>}
                        <button type="button" onClick={() => setCriando(null)} className="cursor-pointer self-start text-sm font-bold text-texto-2 hover:opacity-80">
                          Cancelar
                        </button>
                      </div>
                    )}
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
        </fieldset>

        {/* Rodapé fixo: erro e botões sempre à vista, mesmo com o formulário rolado */}
        <div className="flex flex-col gap-3 border-t border-borda px-6 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {erroGeral && (
            <p role="alert" className="text-sm font-medium text-alerta">
              {erroGeral}
            </p>
          )}

          {confirmandoExclusao && (
            <p role="alert" className="rounded-xl bg-alerta-suave p-3 text-sm font-semibold text-alerta">
              Tem certeza? Isso apaga o registro e não dá para desfazer. Toque de novo em “Sim, excluir” para confirmar.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            {onExcluir && (
              <button
                type="button"
                onClick={excluir}
                disabled={!!ocupado}
                aria-busy={ocupado === 'excluindo' || undefined}
                className="mr-auto inline-flex cursor-pointer items-center gap-2 py-2 text-sm font-bold text-alerta hover:opacity-80 disabled:cursor-wait disabled:opacity-75">
                {ocupado === 'excluindo' && <Girando />}
                {ocupado === 'excluindo' ? 'Excluindo…' : confirmandoExclusao ? 'Sim, excluir' : excluirTexto}
              </button>
            )}
            <Botao titulo="Cancelar" secundario desabilitado={!!ocupado} onClick={onFechar} className="py-2.5" />
            <Botao
              titulo={ocupado === 'salvando' ? 'Salvando…' : salvarTexto}
              tipo="submit"
              carregando={ocupado === 'salvando'}
              desabilitado={!!ocupado}
              className="py-2.5"
            />
          </div>
          <p className="-mt-1 text-xs font-medium text-texto-2">
            <span className="text-alerta">*</span> obrigatório
          </p>
        </div>
      </form>
    </div>
  );
}

/** Campo `varios`: cada opção liga e desliga; "Marcar todos" para o lote inteiro. */
function Varios({ opcoes, valor, rotuloId, onMudar }: { opcoes: { valor: string; rotulo: string }[]; valor: string; rotuloId: string; onMudar: (v: string) => void }) {
  const lista = marcados(valor);
  const todos = lista.length === opcoes.length;
  const alternar = (v: string) => onMudar((lista.includes(v) ? lista.filter((m) => m !== v) : [...lista, v]).join(','));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-texto-2" aria-live="polite">
          {lista.length} de {opcoes.length} {lista.length === 1 ? 'marcado' : 'marcados'}
        </span>
        <button
          type="button"
          onClick={() => onMudar(todos ? '' : opcoes.map((o) => o.valor).join(','))}
          className="cursor-pointer text-sm font-bold text-texto-2 underline hover:opacity-80">
          {todos ? 'Desmarcar todos' : 'Marcar todos'}
        </button>
      </div>
      <div role="group" aria-labelledby={rotuloId} className="flex flex-wrap gap-2">
        {opcoes.map((o) => (
          <Chip key={o.valor} titulo={o.rotulo} ativo={lista.includes(o.valor)} onClick={() => alternar(o.valor)} />
        ))}
      </div>
    </div>
  );
}
