-- Checagem de "cada conta é uma empresa" (0007) e da aprovação (0002). Roda numa transação e desfaz tudo no final.
-- Falha com exceção se uma empresa enxergar, alterar ou apontar para dados de outra, ou se conta pendente tiver acesso.
begin;

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  pendente uuid := gen_random_uuid();
  lote_a bigint;
  animal_a bigint;
  rec_a bigint;
  v_qtd int;
  v_aprovado boolean;
begin
  -- Cadastro: nasce pendente e já com a própria fazenda.
  insert into auth.users (id, email) values (a, '__check_a@exemplo.test'), (b, '__check_b@exemplo.test'), (pendente, '__check_p@exemplo.test');
  select aprovado into v_aprovado from public.membros where user_id = pendente;
  assert v_aprovado is false, 'conta nova deveria nascer pendente';
  select count(*) into v_qtd from public.fazenda where empresa_id in (a, b, pendente);
  assert v_qtd = 3, format('cada conta nova deveria ganhar a própria fazenda, vieram %s', v_qtd);
  update public.membros set aprovado = true where user_id in (a, b);

  -- Empresa A lança seus dados.
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.lotes (nome) values ('Pasto') returning id into lote_a;
  insert into public.animais (brinco, sexo, lote_id, entrada_tipo) values ('0001', 'M', lote_a, 'compra') returning id into animal_a;
  insert into public.pesagens (animal_id, peso) values (animal_a, 250);
  insert into public.despesas_recorrentes (descricao, categoria, valor, dia_vencimento) values ('__check_rec', 'fixo', 100, 5) returning id into rec_a;
  perform public.gerar_recorrentes();
  update public.fazenda set nome = 'Fazenda A' where id = 1;
  select count(*) into v_qtd from public.despesas where recorrente_id = rec_a;
  assert v_qtd = 1, 'recorrente deveria gerar a despesa na própria empresa';

  -- Empresa B não vê nem mexe nos dados de A, mas pode usar os mesmos nomes e brincos.
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into v_qtd from public.lotes;
  assert v_qtd = 0, format('B não deveria ver lotes de A, viu %s', v_qtd);
  select count(*) into v_qtd from public.fazenda;
  assert v_qtd = 1, format('B deveria ver só a própria fazenda, viu %s', v_qtd);
  update public.lotes set nome = 'invadido' where id = lote_a;
  delete from public.animais where id = animal_a;
  update public.fazenda set nome = 'Fazenda B' where id = 1;
  insert into public.lotes (nome) values ('Pasto');
  begin
    insert into public.animais (brinco, sexo, lote_id, entrada_tipo) values ('0001', 'F', lote_a, 'compra');
    raise exception 'B não deveria conseguir usar o lote de A';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.lotes (empresa_id, nome) values (a, '__check_intruso');
    raise exception 'B não deveria conseguir gravar na empresa de A';
  exception when insufficient_privilege then null;
  end;

  -- Conta pendente não vê nem grava nada, e não se aprova.
  perform set_config('request.jwt.claims', json_build_object('sub', pendente, 'role', 'authenticated')::text, true);
  select count(*) into v_qtd from public.fazenda;
  assert v_qtd = 0, 'pendente não deveria ver nem a própria fazenda';
  begin
    insert into public.lotes (nome) values ('__check_pendente');
    raise exception 'pendente não deveria conseguir inserir';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.membros set aprovado = true where user_id = pendente;
    raise exception 'pendente não deveria conseguir se aprovar';
  exception when insufficient_privilege then null;
  end;

  reset role;
  select count(*) into v_qtd from public.lotes where empresa_id = a and nome = 'Pasto';
  assert v_qtd = 1, 'o lote de A deveria continuar intacto';
  select count(*) into v_qtd from public.animais where id = animal_a;
  assert v_qtd = 1, 'o animal de A não deveria ter sido apagado por B';
  assert (select nome from public.fazenda where empresa_id = a) = 'Fazenda A', 'B não deveria mudar o nome da fazenda de A';
  assert (select nome from public.fazenda where empresa_id = b) = 'Fazenda B', 'B deveria mudar o nome da própria fazenda';

  -- Excluir a conta apaga a empresa inteira.
  delete from auth.users where id = a;
  select (select count(*) from public.lotes where empresa_id = a) + (select count(*) from public.animais where empresa_id = a)
       + (select count(*) from public.pesagens where empresa_id = a) + (select count(*) from public.despesas where empresa_id = a)
       + (select count(*) from public.despesas_recorrentes where empresa_id = a) + (select count(*) from public.fazenda where empresa_id = a)
    into v_qtd;
  assert v_qtd = 0, format('excluir a conta deveria apagar os dados da empresa, sobraram %s', v_qtd);

  raise notice 'OK: empresas isoladas, aprovação e exclusão conferem';
end $$;

rollback;
