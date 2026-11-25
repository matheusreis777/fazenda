-- Checagem do acesso por aprovação. Cria uma conta fictícia, testa como ela e desfaz tudo no final.
-- Falha com exceção se uma conta pendente conseguir ler, gravar ou se aprovar.
begin;

do $$
declare
  v_user uuid := gen_random_uuid();
  v_qtd int;
  v_aprovado boolean;
begin
  -- Conta nova: o gatilho deve criar a linha pendente.
  insert into auth.users (id, email) values (v_user, '__check@exemplo.test');
  select aprovado into v_aprovado from public.membros where user_id = v_user;
  assert v_aprovado is false, 'conta nova deveria nascer pendente';

  insert into public.lotes (nome) values ('__check_lote');

  -- Passa a agir como essa conta, do jeito que a API faz.
  perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into v_qtd from public.lotes;
  assert v_qtd = 0, format('pendente não deveria ver lotes, viu %s', v_qtd);
  begin
    insert into public.lotes (nome) values ('__check_invasor');
    raise exception 'pendente não deveria conseguir inserir';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.membros set aprovado = true where user_id = v_user;
    raise exception 'pendente não deveria conseguir se aprovar';
  exception when insufficient_privilege then null;
  end;
  select count(*) into v_qtd from public.membros;
  assert v_qtd = 1, format('conta deveria ver só a própria linha em membros, viu %s', v_qtd);

  -- O dono aprova (fora do papel da conta) e ela passa a ter acesso.
  reset role;
  update public.membros set aprovado = true where user_id = v_user;
  set local role authenticated;

  select count(*) into v_qtd from public.lotes where nome = '__check_lote';
  assert v_qtd = 1, 'aprovada deveria ver os lotes';
  insert into public.lotes (nome) values ('__check_aprovada');
  perform public.gerar_recorrentes();

  reset role;
end $$;

rollback;
