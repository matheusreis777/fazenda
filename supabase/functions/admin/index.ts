// Função de servidor da tela "Desenvolvedor": administração de contas.
// Roda no Supabase (Edge Function) com a chave secreta, que nunca vai para o app.
// Só atende quem está logado, aprovado e marcado como desenvolvedor em public.membros.
//
// Publicar: pelo conector do Supabase (deploy_edge_function) ou `supabase functions deploy admin`.
// A verificação de JWT da plataforma fica ligada: sem login válido a requisição nem chega aqui.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const responder = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const recusar = (erro: string, status = 400) => responder({ erro }, status);

/** Chave secreta do projeto: a nova (sb_secret_…) se existir, senão a service_role antiga. */
function chaveSecreta(): string {
  const novas = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (novas) {
    const chave = JSON.parse(novas)['default'];
    if (chave) return chave;
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SENHA_MINIMA = 6;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return recusar('Método não suportado.', 405);

  const banco = createClient(Deno.env.get('SUPABASE_URL') ?? '', chaveSecreta(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Quem está chamando? O token é conferido no servidor de autenticação, não lido "no olho".
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: quem, error: erroToken } = await banco.auth.getUser(token);
  if (erroToken || !quem.user) return recusar('Sessão inválida. Entre de novo.', 401);
  const eu = quem.user.id;

  // 2. É desenvolvedor? Lido do banco a cada chamada: tirar o papel vale na hora.
  const { data: meu, error: erroMembro } = await banco.from('membros').select('aprovado, admin').eq('user_id', eu).maybeSingle();
  if (erroMembro) return recusar('Não foi possível conferir sua permissão.', 500);
  if (!meu?.aprovado || !meu.admin) return recusar('Só desenvolvedores podem usar esta tela.', 403);

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return recusar('Pedido inválido.');
  }
  const acao = String(corpo.acao ?? '');

  if (acao === 'listar') {
    // ponytail: uma página de até 1000 contas; paginar se a fazenda um dia passar disso.
    const { data: lista, error } = await banco.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return recusar(`Não foi possível listar as contas: ${error.message}`, 500);
    const { data: membros, error: erroLista } = await banco.from('membros').select('user_id, aprovado, admin');
    if (erroLista) return recusar('Não foi possível ler as aprovações.', 500);
    const porId = new Map((membros ?? []).map((m) => [m.user_id, m]));
    return responder({
      eu,
      contas: lista.users
        .map((u) => ({
          id: u.id,
          email: u.email ?? '',
          criada_em: u.created_at,
          ultimo_acesso: u.last_sign_in_at ?? null,
          email_confirmado: !!u.email_confirmed_at,
          aprovado: porId.get(u.id)?.aprovado ?? false,
          admin: porId.get(u.id)?.admin ?? false,
        }))
        .sort((a, b) => b.criada_em.localeCompare(a.criada_em)),
    });
  }

  if (acao === 'criar') {
    const email = String(corpo.email ?? '').trim().toLowerCase();
    const senha = String(corpo.senha ?? '');
    if (!EMAIL.test(email)) return recusar('E-mail inválido.');
    if (senha.length < SENHA_MINIMA) return recusar(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
    const { data, error } = await banco.auth.admin.createUser({ email, password: senha, email_confirm: true });
    if (error || !data.user) {
      return recusar(error?.code === 'email_exists' ? 'Já existe uma conta com esse e-mail.' : `Não foi possível criar a conta: ${error?.message}`);
    }
    // Conta criada pelo desenvolvedor já nasce aprovada (o gatilho do banco criou a linha pendente).
    const { error: erroAprovar } = await banco.from('membros').upsert({ user_id: data.user.id, email, aprovado: true });
    if (erroAprovar) return recusar('Conta criada, mas não foi possível aprová-la. Aprove pela lista.', 500);
    return responder({ ok: true });
  }

  // Daqui em diante, toda ação é sobre uma conta específica.
  const alvo = String(corpo.user_id ?? '');
  if (!UUID.test(alvo)) return recusar('Conta inválida.');
  const emMim = alvo === eu;

  if (acao === 'aprovar') {
    const aprovado = corpo.valor === true;
    if (emMim && !aprovado) return recusar('Você não pode bloquear a própria conta.');
    const { error } = await banco.from('membros').update({ aprovado }).eq('user_id', alvo);
    return error ? recusar('Não foi possível alterar o acesso.', 500) : responder({ ok: true });
  }

  if (acao === 'admin') {
    const admin = corpo.valor === true;
    if (emMim && !admin) return recusar('Você não pode tirar o próprio papel de desenvolvedor.');
    // Desenvolvedor precisa de acesso aos dados, então virar desenvolvedor também aprova.
    const { error } = await banco.from('membros').update(admin ? { admin, aprovado: true } : { admin }).eq('user_id', alvo);
    return error ? recusar('Não foi possível alterar o papel.', 500) : responder({ ok: true });
  }

  if (acao === 'senha') {
    const senha = String(corpo.senha ?? '');
    if (senha.length < SENHA_MINIMA) return recusar(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
    const { error } = await banco.auth.admin.updateUserById(alvo, { password: senha });
    return error ? recusar(`Não foi possível trocar a senha: ${error.message}`) : responder({ ok: true });
  }

  if (acao === 'confirmar_email') {
    const { error } = await banco.auth.admin.updateUserById(alvo, { email_confirm: true });
    return error ? recusar(`Não foi possível confirmar o e-mail: ${error.message}`) : responder({ ok: true });
  }

  if (acao === 'excluir') {
    if (emMim) return recusar('Você não pode excluir a própria conta.');
    const { error } = await banco.auth.admin.deleteUser(alvo);
    return error ? recusar(`Não foi possível excluir a conta: ${error.message}`) : responder({ ok: true });
  }

  return recusar('Ação desconhecida.');
});
