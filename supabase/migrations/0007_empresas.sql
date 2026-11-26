-- Cada conta (auth.users) é uma empresa: tem a própria fazenda e só enxerga os próprios dados.
-- Toda tabela de dados ganha `empresa_id` = id da conta dona, preenchido sozinho com auth.uid().
-- O que já existia fica com a conta mais antiga (a do primeiro desenvolvedor, ver 0003).
-- Excluir a conta apaga a empresa inteira (on delete cascade).
-- A aprovação continua valendo (0002): conta pendente não lê nem grava nada, nem da própria empresa.

do $$
declare
  t text;
  dono constant uuid := (select id from auth.users order by created_at limit 1);
  todas constant text[] := array['lotes', 'animais', 'insumos', 'tratos', 'despesas', 'despesas_recorrentes',
                                 'pesagens', 'sanidade', 'funcionarios', 'maquinas', 'fazenda'];
begin
  foreach t in array todas loop
    execute format('alter table %I add column empresa_id uuid references auth.users (id) on delete cascade', t);
    execute format('update %I set empresa_id = %L', t, dono);
  end loop;
  -- Só acontece num banco sem nenhuma conta: a linha da fazenda criada em 0005 fica sem dono.
  delete from public.fazenda where empresa_id is null;

  foreach t in array todas loop
    execute format('alter table %I alter column empresa_id set not null, alter column empresa_id set default auth.uid()', t);
    execute format('drop policy if exists aprovado_tudo on %I', t);
    execute format(
      'create policy propria_empresa on %I for all to authenticated
         using (empresa_id = (select auth.uid())
                and (select exists (select 1 from public.membros m where m.user_id = (select auth.uid()) and m.aprovado)))
         with check (empresa_id = (select auth.uid())
                and (select exists (select 1 from public.membros m where m.user_id = (select auth.uid()) and m.aprovado)))',
      t);
    -- Alvo das chaves estrangeiras compostas abaixo; também é o índice que o RLS usa.
    if t <> 'fazenda' then
      execute format('alter table %I add unique (empresa_id, id)', t);
    end if;
  end loop;
end $$;

drop policy aprovado_le on fazenda;
drop policy aprovado_altera on fazenda;

-- Fazenda: uma linha por empresa. O `id` continua sempre 1 (o app altera por ele); o RLS escolhe a linha da conta.
alter table fazenda drop constraint fazenda_pkey, add primary key (empresa_id);
insert into fazenda (empresa_id) select id from auth.users on conflict (empresa_id) do nothing;

-- Nomes e brincos passam a ser únicos dentro de cada empresa, não no sistema todo.
alter table lotes drop constraint lotes_nome_key, add unique (empresa_id, nome);
alter table insumos drop constraint insumos_nome_key, add unique (empresa_id, nome);
drop index animais_brinco_ativo;
create unique index animais_brinco_ativo on animais (empresa_id, brinco) where saida_data is null;

-- Chaves estrangeiras compostas: um lançamento só aponta para lote, insumo, animal… da mesma empresa.
-- (A checagem de chave estrangeira ignora o RLS; sem isso, uma empresa poderia ligar dados a ids de outra.)
alter table animais
  drop constraint animais_lote_id_fkey,
  add foreign key (empresa_id, lote_id) references lotes (empresa_id, id);
alter table tratos
  drop constraint tratos_lote_id_fkey,
  drop constraint tratos_insumo_id_fkey,
  add foreign key (empresa_id, lote_id) references lotes (empresa_id, id),
  add foreign key (empresa_id, insumo_id) references insumos (empresa_id, id);
alter table despesas
  drop constraint despesas_insumo_id_fkey,
  drop constraint despesas_recorrente_id_fkey,
  drop constraint despesas_funcionario_id_fkey,
  drop constraint despesas_maquina_id_fkey,
  add foreign key (empresa_id, insumo_id) references insumos (empresa_id, id),
  add foreign key (empresa_id, recorrente_id) references despesas_recorrentes (empresa_id, id) on delete set null (recorrente_id),
  add foreign key (empresa_id, funcionario_id) references funcionarios (empresa_id, id),
  add foreign key (empresa_id, maquina_id) references maquinas (empresa_id, id);
alter table despesas_recorrentes
  drop constraint despesas_recorrentes_funcionario_id_fkey,
  drop constraint despesas_recorrentes_maquina_id_fkey,
  add foreign key (empresa_id, funcionario_id) references funcionarios (empresa_id, id),
  add foreign key (empresa_id, maquina_id) references maquinas (empresa_id, id);
alter table pesagens
  drop constraint pesagens_animal_id_fkey,
  add foreign key (empresa_id, animal_id) references animais (empresa_id, id) on delete cascade;
alter table sanidade
  drop constraint sanidade_animal_id_fkey,
  drop constraint sanidade_lote_id_fkey,
  add foreign key (empresa_id, animal_id) references animais (empresa_id, id) on delete cascade,
  add foreign key (empresa_id, lote_id) references lotes (empresa_id, id);

-- A despesa gerada é da mesma empresa da recorrente (explícito, para valer também fora do RLS).
create or replace function gerar_recorrentes() returns void
language sql
set search_path = ''
as $$
  insert into public.despesas (empresa_id, data, categoria, descricao, valor, recorrente_id, funcionario_id, maquina_id)
  select
    r.empresa_id,
    (date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date + (r.dia_vencimento - 1)),
    r.categoria, r.descricao, r.valor, r.id, r.funcionario_id, r.maquina_id
  from public.despesas_recorrentes r
  where r.ativo
  on conflict do nothing;
$$;

-- Cadastro novo = empresa nova: além da linha pendente em membros, nasce a fazenda da conta (sem nome).
create or replace function privado.criar_membro() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.membros (user_id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (user_id) do nothing;
  insert into public.fazenda (empresa_id) values (new.id)
  on conflict (empresa_id) do nothing;
  return new;
end;
$$;
