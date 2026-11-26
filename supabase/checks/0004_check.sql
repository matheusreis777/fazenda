-- Checagem de pesagens, sanidade, funcionários e máquinas. Roda numa transação e desfaz tudo no final.
begin;
-- Desde 0007 toda linha é de uma empresa (empresa_id = auth.uid()): grava como a conta mais antiga.
select set_config('request.jwt.claims', json_build_object('sub', (select id from auth.users order by created_at limit 1))::text, true);

do $$
declare
  v_user uuid := gen_random_uuid();
  v_lote bigint;
  v_animal bigint;
  v_func bigint;
  v_maq bigint;
  v_qtd int;
begin
  insert into lotes (nome) values ('__check_lote') returning id into v_lote;
  insert into animais (brinco, sexo, lote_id, entrada_tipo) values ('__check_a', 'M', v_lote, 'compra') returning id into v_animal;

  -- Sanidade exige animal OU lote, nunca os dois nem nenhum.
  insert into sanidade (tipo, produto, animal_id) values ('vacina', 'Aftosa', v_animal);
  insert into sanidade (tipo, produto, lote_id) values ('vermifugo', 'Ivermectina', v_lote);
  begin
    insert into sanidade (tipo, produto) values ('vacina', 'sem alvo');
    raise exception 'sanidade sem animal nem lote deveria falhar';
  exception when check_violation then null;
  end;
  begin
    insert into sanidade (tipo, produto, data, proxima_data, lote_id) values ('vacina', 'x', '2026-11-10', '2026-11-01', v_lote);
    raise exception 'próxima dose antes da aplicação deveria falhar';
  exception when check_violation then null;
  end;

  -- Excluir o animal leva junto as pesagens e a sanidade dele.
  insert into pesagens (animal_id, peso) values (v_animal, 250);
  delete from animais where id = v_animal;
  select count(*) into v_qtd from pesagens where animal_id = v_animal;
  assert v_qtd = 0, 'pesagens do animal excluído deveriam sumir';

  -- Recorrente ligada a funcionário e máquina gera despesa com os dois.
  insert into funcionarios (nome) values ('__check_func') returning id into v_func;
  insert into maquinas (nome) values ('__check_maq') returning id into v_maq;
  insert into despesas_recorrentes (descricao, categoria, valor, dia_vencimento, funcionario_id, maquina_id)
    values ('__check_rec', 'funcionarios', 100, 5, v_func, v_maq);
  perform gerar_recorrentes();
  select count(*) into v_qtd from despesas where descricao = '__check_rec' and funcionario_id = v_func and maquina_id = v_maq;
  assert v_qtd = 1, 'despesa gerada deveria levar funcionário e máquina';

  -- Funcionário com despesas não pode ser excluído.
  begin
    delete from funcionarios where id = v_func;
    raise exception 'funcionário com despesas não deveria ser excluído';
  exception when foreign_key_violation then null;
  end;

  -- Conta pendente não vê as tabelas novas.
  insert into auth.users (id, email) values (v_user, '__check@exemplo.test');
  perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_qtd from public.funcionarios;
  assert v_qtd = 0, 'pendente não deveria ver funcionários';
  select count(*) into v_qtd from public.sanidade;
  assert v_qtd = 0, 'pendente não deveria ver sanidade';
  reset role;
end $$;

rollback;
