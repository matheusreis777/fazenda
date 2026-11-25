-- Schema inicial: rebanho, alimentação e financeiro.

create domain categoria_despesa as text
  check (value in ('alimentacao', 'maquinario', 'funcionarios', 'mantimentos', 'fixo', 'outros'));

create table lotes (
  id bigint generated always as identity primary key,
  nome text not null unique,
  descricao text
);

create table animais (
  id bigint generated always as identity primary key,
  brinco text not null,
  sexo text not null check (sexo in ('M', 'F')),
  raca text,
  nascimento date,
  lote_id bigint not null references lotes (id),
  entrada_data date not null default current_date,
  entrada_tipo text not null check (entrada_tipo in ('compra', 'nascimento')),
  entrada_peso numeric(7, 2) check (entrada_peso > 0),
  entrada_valor numeric(12, 2) check (entrada_valor >= 0),
  saida_data date,
  saida_tipo text check (saida_tipo in ('venda', 'morte', 'abate')),
  saida_peso numeric(7, 2) check (saida_peso > 0),
  saida_valor numeric(12, 2) check (saida_valor >= 0),
  check ((saida_data is null) = (saida_tipo is null)),
  check (saida_data >= entrada_data)
);
-- Brinco único só entre animais ativos (brinco pode ser reaproveitado após a saída).
create unique index animais_brinco_ativo on animais (brinco) where saida_data is null;
create index animais_lote on animais (lote_id);

create table insumos (
  id bigint generated always as identity primary key,
  nome text not null unique,
  unidade text not null default 'kg',
  -- Abaixo do mínimo o app destaca como estoque baixo.
  minimo numeric(12, 3) not null default 0 check (minimo >= 0),
  -- O que já havia ao cadastrar o insumo (antes de compras e tratos lançados).
  saldo_inicial numeric(12, 3) not null default 0 check (saldo_inicial >= 0)
);

create table tratos (
  id bigint generated always as identity primary key,
  data date not null default current_date,
  lote_id bigint not null references lotes (id),
  insumo_id bigint not null references insumos (id),
  quantidade numeric(12, 3) not null check (quantidade > 0)
);
create index tratos_insumo on tratos (insumo_id);
create index tratos_lote on tratos (lote_id);

create table despesas_recorrentes (
  id bigint generated always as identity primary key,
  descricao text not null,
  categoria categoria_despesa not null,
  valor numeric(12, 2) not null check (valor > 0),
  -- ponytail: limitado a 1–28 para existir em todo mês; tratar "último dia" se precisar.
  dia_vencimento int not null check (dia_vencimento between 1 and 28),
  ativo boolean not null default true
);

create table despesas (
  id bigint generated always as identity primary key,
  data date not null default current_date,
  categoria categoria_despesa not null,
  descricao text not null,
  valor numeric(12, 2) not null check (valor >= 0),
  -- Preenchidos quando a despesa é compra de insumo (entra no estoque).
  insumo_id bigint references insumos (id),
  quantidade numeric(12, 3) check (quantidade > 0),
  recorrente_id bigint references despesas_recorrentes (id) on delete set null,
  check ((insumo_id is null) = (quantidade is null))
);
create index despesas_data on despesas (data);
create index despesas_insumo on despesas (insumo_id);
-- Uma despesa por recorrente por mês: torna gerar_recorrentes() idempotente.
create unique index despesas_recorrente_mes
  on despesas (recorrente_id, date_trunc('month', data::timestamp))
  where recorrente_id is not null;

-- Estoque = saldo inicial + compras (despesas com insumo) − consumo (tratos).
create view estoque_insumos with (security_invoker = true) as
select
  i.id,
  i.nome,
  i.unidade,
  i.minimo,
  i.saldo_inicial
    + coalesce((select sum(d.quantidade) from despesas d where d.insumo_id = i.id), 0)
    - coalesce((select sum(t.quantidade) from tratos t where t.insumo_id = i.id), 0) as saldo
from insumos i;

-- Lança as despesas recorrentes ativas do mês corrente. Pode ser chamada quantas vezes quiser.
create function gerar_recorrentes() returns void
language sql
set search_path = ''
as $$
  insert into public.despesas (data, categoria, descricao, valor, recorrente_id)
  select
    (date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date + (r.dia_vencimento - 1)),
    r.categoria, r.descricao, r.valor, r.id
  from public.despesas_recorrentes r
  where r.ativo
  on conflict do nothing;
$$;

-- Acesso: qualquer usuário autenticado vê e edita tudo; anônimo não acessa nada.
do $$
declare t text;
begin
  foreach t in array array['lotes', 'animais', 'insumos', 'tratos', 'despesas', 'despesas_recorrentes'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy autenticado_tudo on %I for all to authenticated using (true) with check (true)', t);
    execute format('revoke all on %I from anon', t);
    execute format('grant select, insert, update, delete on %I to authenticated', t);
  end loop;
end $$;

revoke all on estoque_insumos from anon;
grant select on estoque_insumos to authenticated;
revoke execute on function gerar_recorrentes() from public, anon;
grant execute on function gerar_recorrentes() to authenticated;
