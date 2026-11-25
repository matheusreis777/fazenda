// Chamadas da tela "Desenvolvedor" para a função de servidor supabase/functions/admin.
// A permissão é conferida lá, a cada chamada; esconder a aba no app é só conveniência.
import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

export type Conta = {
  id: string;
  email: string;
  criada_em: string;
  ultimo_acesso: string | null;
  email_confirmado: boolean;
  aprovado: boolean;
  admin: boolean;
};

type Pedido =
  | { acao: 'listar' }
  | { acao: 'criar'; email: string; senha: string }
  | { acao: 'aprovar' | 'admin'; user_id: string; valor: boolean }
  | { acao: 'senha'; user_id: string; senha: string }
  | { acao: 'confirmar_email' | 'excluir'; user_id: string };

/** Devolve a resposta da função, ou `erro` com a mensagem para mostrar. */
async function chamar<T>(pedido: Pedido): Promise<{ dados?: T; erro?: string }> {
  const { data, error } = await supabase.functions.invoke('admin', { body: pedido });
  if (!error) return { dados: data as T };
  // Recusas da função (400/401/403) vêm com a mensagem pronta no corpo.
  if (error instanceof FunctionsHttpError) {
    const corpo = await (error.context as Response).json().catch(() => null);
    if (corpo?.erro) return { erro: String(corpo.erro) };
  }
  return { erro: 'Não foi possível falar com o servidor. Confira a conexão e tente de novo.' };
}

export const listarContas = () => chamar<{ eu: string; contas: Conta[] }>({ acao: 'listar' });

/** Para as ações que só dizem se deu certo: null = ok, texto = erro (o formato que o Formulario espera). */
export async function executar(pedido: Exclude<Pedido, { acao: 'listar' }>): Promise<string | null> {
  return (await chamar(pedido)).erro ?? null;
}
