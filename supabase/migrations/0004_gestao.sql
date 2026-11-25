-- Pesagens, sanidade, funcionários e máquinas.

-- Pesagens: peso de um animal numa data. O ganho de peso é calculado no app a partir delas.
create table pesagens (
  id bigint generated always as identity primary key,
  animal_id bigint not null references animais (id) on delete cascade,
  data date not null default current_date,
  peso numeric(7, 2) not null check (peso > 0)
);
create index pesagens_animal on pesagens (animal_id, data);

-- Sanidade: vacina, vermífugo, tratamento… aplicado num animal ou num lote inteiro.
create table sanidade (
  id bigint generated always as identity primary key,
  data date not null default current_date,
  tipo text not null check (tipo in ('vacina', 'vermifugo', 'tratamento', 'exame', 'outro')),
  produto text not null,
  animal_id bigint references animais (id) on delete cascade,
  lote_id bigint references lotes (id),
  -- Quando repetir (próxima dose, reforço); o app lista as que estão para vencer.
  proxima_data date check (proxima_data >= data),
  observacao text,
  check ((animal_id is null) <> (lote_id is null))
);
create index sanidade_animal on sanidade (animal_id);
create index sanidade_lote on sanidade (lote_id);
create index sanidade_proxima on sanidade (proxima_data) where proxima_data is not null;

create table funcionarios (
  id bigint generated always as identity primary key,
  nome text not null,
  funcao text,
  telefone text,
  salario numeric(12, 2) check (salario >= 0),
  admissao date,
  ativo boolean not null default true
);

create table maquinas (
  id bigint generated always as identity primary key,
  nome text not null,
  tipo text,
  identificacao text, -- placa, chassi ou número de série
  ano int check (ano between 1900 and 2100),
  ativo boolean not null default true
);

-- Gastos ligados a um funcionário ou a uma máquina (salário, manutenção, diesel…).
alter table despesas
  add column funcionario_id bigint references funcionarios (id),
  add column maquina_id bigint references maquinas (id);
create index despesas_funcionario on despesas (funcionario_id);
create index despesas_maquina on despesas (maquina_id);

alter table despesas_recorrentes
  add column funcionario_id bigint references funcionarios (id),
  add column maquina_id bigint references maquinas (id);

-- As despesas geradas das recorrentes levam junto o funcionário e a máquina.
create or replace function gerar_recorrentes() returns void
language sql
set search_path = ''
as $$
  insert into public.despesas (data, categoria, descricao, valor, recorrente_id, funcionario_id, maquina_id)
  select
    (date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date + (r.dia_vencimento - 1)),
    r.categoria, r.descricao, r.valor, r.id, r.funcionario_id, r.maquina_id
  from public.despesas_recorrentes r
  where r.ativo
  on conflict do nothing;
$$;

-- Mesmo acesso das outras tabelas: só contas aprovadas (ver 0002_membros.sql).
do $$
declare t text;
begin
  foreach t in array array['pesagens', 'sanidade', 'funcionarios', 'maquinas'] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy aprovado_tudo on %I for all to authenticated
         using ((select exists (select 1 from public.membros m where m.user_id = (select auth.uid()) and m.aprovado)))
         with check ((select exists (select 1 from public.membros m where m.user_id = (select auth.uid()) and m.aprovado)))',
      t);
    execute format('revoke all on %I from anon', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;
