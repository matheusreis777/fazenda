-- Checagem do número da GTA nos animais. Roda numa transação e desfaz tudo no final.
begin;
-- Desde 0007 toda linha é de uma empresa (empresa_id = auth.uid()): grava como a conta mais antiga.
select set_config('request.jwt.claims', json_build_object('sub', (select id from auth.users order by created_at limit 1))::text, true);

do $$
declare
  v_lote bigint;
  v_animal bigint;
begin
  insert into lotes (nome) values ('__check_lote') returning id into v_lote;
  insert into animais (brinco, sexo, lote_id, entrada_tipo, entrada_gta)
    values ('__check_a', 'M', v_lote, 'compra', 'MS 123456') returning id into v_animal;
  update animais set saida_tipo = 'venda', saida_data = current_date, saida_gta = 'MS 654321' where id = v_animal;

  begin
    update animais set saida_gta = repeat('x', 101) where id = v_animal;
    raise exception 'GTA com mais de 100 letras deveria falhar';
  exception when check_violation then null;
  end;
end $$;

rollback;
