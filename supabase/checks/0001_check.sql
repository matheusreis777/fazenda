-- Checagem do schema inicial. Roda numa transação e desfaz tudo no final.
-- Falha com exceção se o estoque ou as recorrentes estiverem errados.
begin;
-- Desde 0007 toda linha é de uma empresa (empresa_id = auth.uid()): grava como a conta mais antiga.
select set_config('request.jwt.claims', json_build_object('sub', (select id from auth.users order by created_at limit 1))::text, true);

do $$
declare
  v_lote bigint;
  v_insumo bigint;
  v_rec bigint;
  v_saldo numeric;
  v_qtd int;
begin
  insert into lotes (nome) values ('__check_lote') returning id into v_lote;
  insert into insumos (nome, saldo_inicial) values ('__check_racao', 10) returning id into v_insumo;

  -- Estoque: 10 iniciais + compra 100 − consumo 30 → 80.
  insert into despesas (categoria, descricao, valor, insumo_id, quantidade)
    values ('alimentacao', 'compra racao', 500, v_insumo, 100);
  insert into tratos (lote_id, insumo_id, quantidade) values (v_lote, v_insumo, 30);
  select saldo into v_saldo from estoque_insumos where id = v_insumo;
  assert v_saldo = 80, format('estoque esperado 80, veio %s', v_saldo);

  -- Recorrentes: rodar duas vezes no mês gera uma despesa só; inativa não gera.
  insert into despesas_recorrentes (descricao, categoria, valor, dia_vencimento)
    values ('__check_salario', 'funcionarios', 2000, 5) returning id into v_rec;
  insert into despesas_recorrentes (descricao, categoria, valor, dia_vencimento, ativo)
    values ('__check_inativa', 'fixo', 100, 10, false);
  perform gerar_recorrentes();
  perform gerar_recorrentes();
  select count(*) into v_qtd from despesas where recorrente_id = v_rec;
  assert v_qtd = 1, format('recorrente deveria gerar 1 despesa, gerou %s', v_qtd);
  select count(*) into v_qtd from despesas where descricao = '__check_inativa';
  assert v_qtd = 0, 'recorrente inativa não deveria gerar despesa';

  -- Brinco: duplicado entre ativos falha; liberado após a saída.
  insert into animais (brinco, sexo, lote_id, entrada_tipo) values ('__check_1', 'M', v_lote, 'compra');
  begin
    insert into animais (brinco, sexo, lote_id, entrada_tipo) values ('__check_1', 'F', v_lote, 'compra');
    raise exception 'brinco duplicado ativo deveria falhar';
  exception when unique_violation then null;
  end;
  update animais set saida_data = current_date, saida_tipo = 'venda' where brinco = '__check_1';
  insert into animais (brinco, sexo, lote_id, entrada_tipo) values ('__check_1', 'F', v_lote, 'compra');

  raise notice 'OK: estoque, recorrentes e brinco conferem';
end $$;

rollback;
