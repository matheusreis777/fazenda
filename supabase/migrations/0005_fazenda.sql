-- Dados da própria fazenda (por enquanto só o nome), mostrados no menu, nas certidões e nos relatórios.
-- Uma linha só (id = 1), criada aqui: o app só lê e altera, nunca cria nem apaga.
create table fazenda (
  id int primary key default 1 check (id = 1),
  nome text not null default '' check (char_length(nome) <= 80)
);
insert into fazenda (id, nome) values (1, '');

alter table fazenda enable row level security;
-- Mesma regra das outras tabelas: só contas aprovadas veem e mudam. Sem grant de insert/delete,
-- ninguém cria uma segunda linha nem apaga a única.
revoke all on fazenda from anon, authenticated;
grant select, update on fazenda to authenticated;
create policy aprovado_le on fazenda for select to authenticated
  using ((select exists (select 1 from public.membros m where m.user_id = (select auth.uid()) and m.aprovado)));
create policy aprovado_altera on fazenda for update to authenticated
  using ((select exists (select 1 from public.membros m where m.user_id = (select auth.uid()) and m.aprovado)))
  with check ((select exists (select 1 from public.membros m where m.user_id = (select auth.uid()) and m.aprovado)));
