-- Cadastro aberto na tela de login, mas dados só para contas aprovadas.
-- Toda conta nova nasce pendente; aprovar = marcar `aprovado` em public.membros
-- (painel do Supabase → Table Editor → membros, ou por SQL).

create table membros (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  aprovado boolean not null default false,
  criado_em timestamptz not null default now()
);

alter table membros enable row level security;
-- A pessoa só enxerga a própria linha (para o app saber se está aprovada) e não pode alterar nada:
-- sem grant nem policy de insert/update/delete, ninguém se aprova sozinho.
revoke all on membros from anon, authenticated;
grant select on membros to authenticated;
create policy propria_linha on membros for select to authenticated
  using ((select auth.uid()) = user_id);

-- Cria a linha pendente quando alguém se cadastra. Fica num schema fora da API,
-- porque roda com privilégio de dono (security definer) e não deve ser chamável por ninguém.
create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;

create function privado.criar_membro() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.membros (user_id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke execute on function privado.criar_membro() from public, anon, authenticated;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function privado.criar_membro();

-- Contas que já existiam antes desta migração já tinham acesso a tudo; continuam com ele (aprovadas).
-- Só as contas criadas daqui em diante nascem pendentes.
insert into membros (user_id, email, aprovado)
select id, coalesce(email, ''), true from auth.users
on conflict (user_id) do nothing;

-- Troca "qualquer autenticado" por "autenticado e aprovado" em todas as tabelas de dados.
do $$
declare t text;
begin
  foreach t in array array['lotes', 'animais', 'insumos', 'tratos', 'despesas', 'despesas_recorrentes'] loop
    execute format('drop policy autenticado_tudo on %I', t);
    execute format(
      'create policy aprovado_tudo on %I for all to authenticated
         using ((select exists (select 1 from public.membros m where m.user_id = (select auth.uid()) and m.aprovado)))
         with check ((select exists (select 1 from public.membros m where m.user_id = (select auth.uid()) and m.aprovado)))',
      t);
  end loop;
end $$;
