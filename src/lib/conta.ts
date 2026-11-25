// Ações da própria conta (a pessoa logada), sem passar pela tela de desenvolvedor.
import { supabase } from '@/lib/supabase';

export const SENHA_MINIMA = 6;

const ERROS: Record<string, string> = {
  same_password: 'A nova senha precisa ser diferente da atual.',
  weak_password: 'Senha fraca demais. Use uma senha mais longa.',
  reauthentication_needed: 'Por segurança, saia e entre de novo antes de trocar a senha.',
};

/**
 * Troca a senha de quem está logado. Confere a senha atual antes (entrando de novo com ela),
 * para que alguém com o aparelho desbloqueado não consiga trocar a senha sem saber a atual.
 * Devolve null se deu certo ou a mensagem de erro.
 */
export async function trocarSenha(atual: string, nova: string): Promise<string | null> {
  if (nova.length < SENHA_MINIMA) return `A nova senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) return 'Sessão expirada. Saia e entre de novo.';

  const conferida = await supabase.auth.signInWithPassword({ email, password: atual });
  if (conferida.error) return 'A senha atual está incorreta.';

  const { error } = await supabase.auth.updateUser({ password: nova });
  if (error) return ERROS[error.code ?? ''] ?? `Não foi possível trocar a senha: ${error.message}`;
  return null;
}
