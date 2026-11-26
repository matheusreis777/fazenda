-- Dados de demonstração: 12 meses de uma fazenda de recria e engorda (dez/2025 a nov/2026).
-- Rodar uma vez, com as tabelas vazias. Para apagar depois, ver supabase/seed/limpar.sql.
-- Os números são aleatórios mas sempre os mesmos (setseed), e respeitam as regras do banco:
-- estoque nunca negativo, saída depois da entrada, brinco único entre ativos.
-- Os dados vão para a empresa de uma conta aprovada (troque o e-mail). Roda como essa conta,
-- então o banco preenche o empresa_id e cada consulta abaixo só enxerga a empresa dela.
begin;
select set_config('request.jwt.claims', json_build_object('sub', (select id from auth.users where email = 'troque@exemplo.com'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare
  hoje constant date := date '2026-11-25';
  inicio constant date := date '2025-12-01';
  l_sede bigint; l_acude bigint; l_fundo bigint; l_conf bigint; l_mat bigint;
  i_racao bigint; i_sal bigint; i_silagem bigint; i_nucleo bigint; i_verm bigint; i_vacina bigint;
  f_jose bigint; f_antonio bigint; f_maria bigint;
  m_trator bigint; m_hilux bigint; m_carreta bigint; m_rocadeira bigint;
  r_jose bigint; r_antonio bigint; r_maria bigint; r_energia bigint; r_internet bigint; r_arrend bigint;
  racas text[] := array['Nelore','Nelore','Nelore','Nelore','Nelore','Nelore','Angus','Angus','Brahman','Senepol','Tabapuã','Nelore x Angus'];
  brinco int := 1001;
  a record;
  v_id bigint;
  v_lote bigint;
  v_data date;
  v_peso numeric;
  v_gmd numeric;
  v_saida date;
  v_tipo text;
  v_valor numeric;
  mes date;
  k int;
  lote_compra bigint;
begin
  if exists (select 1 from lotes) or exists (select 1 from animais) then
    raise exception 'O banco já tem dados: o seed só roda com as tabelas vazias.';
  end if;
  perform setseed(0.42);

  -- Lotes
  insert into lotes (nome, descricao) values ('Pasto da Sede', '18 ha · braquiária brizantha') returning id into l_sede;
  insert into lotes (nome, descricao) values ('Pasto do Açude', '22 ha · mombaça') returning id into l_acude;
  insert into lotes (nome, descricao) values ('Pasto do Fundo', '30 ha · braquiária decumbens') returning id into l_fundo;
  insert into lotes (nome, descricao) values ('Confinamento', 'Terminação no cocho · 120 vagas') returning id into l_conf;
  insert into lotes (nome, descricao) values ('Maternidade', 'Vacas e bezerros até a desmama') returning id into l_mat;

  -- Equipe e máquinas
  insert into funcionarios (nome, funcao, telefone, salario, admissao) values ('José da Silva', 'Vaqueiro', '(64) 99812-4410', 2600, '2021-03-01') returning id into f_jose;
  insert into funcionarios (nome, funcao, telefone, salario, admissao) values ('Antônio Souza', 'Tratorista', '(64) 99733-1287', 2400, '2023-08-15') returning id into f_antonio;
  insert into funcionarios (nome, funcao, telefone, salario, admissao) values ('Maria Oliveira', 'Serviços gerais', '(64) 99645-0093', 1900, '2024-02-05') returning id into f_maria;
  insert into funcionarios (nome, funcao, telefone, salario, admissao, ativo) values ('Pedro Lima', 'Vaqueiro (safra)', '(64) 99521-7765', 2200, '2025-06-01', false);
  insert into maquinas (nome, tipo, identificacao, ano) values ('Trator MF', 'Trator', 'Massey Ferguson 4275', 2015) returning id into m_trator;
  insert into maquinas (nome, tipo, identificacao, ano) values ('Hilux', 'Caminhonete', 'QAB-7F21', 2019) returning id into m_hilux;
  insert into maquinas (nome, tipo, identificacao, ano) values ('Carreta boiadeira', 'Implemento', null, 2018) returning id into m_carreta;
  insert into maquinas (nome, tipo, identificacao, ano) values ('Roçadeira', 'Implemento', 'Tatu RC 1700', 2020) returning id into m_rocadeira;

  -- Insumos (saldo inicial = o que havia em 01/12/2025)
  insert into insumos (nome, unidade, minimo, saldo_inicial) values ('Ração de engorda', 'kg', 3000, 4000) returning id into i_racao;
  insert into insumos (nome, unidade, minimo, saldo_inicial) values ('Sal mineral', 'kg', 400, 300) returning id into i_sal;
  insert into insumos (nome, unidade, minimo, saldo_inicial) values ('Silagem de milho', 'kg', 15000, 40000) returning id into i_silagem;
  insert into insumos (nome, unidade, minimo, saldo_inicial) values ('Núcleo proteico', 'kg', 300, 500) returning id into i_nucleo;
  insert into insumos (nome, unidade, minimo, saldo_inicial) values ('Ivermectina 1%', 'doses', 60, 120) returning id into i_verm;
  insert into insumos (nome, unidade, minimo, saldo_inicial) values ('Vacina febre aftosa', 'doses', 80, 50) returning id into i_vacina;

  -- Gastos recorrentes
  insert into despesas_recorrentes (descricao, categoria, valor, dia_vencimento, funcionario_id) values ('Salário — José', 'funcionarios', 2600, 5, f_jose) returning id into r_jose;
  insert into despesas_recorrentes (descricao, categoria, valor, dia_vencimento, funcionario_id) values ('Salário — Antônio', 'funcionarios', 2400, 5, f_antonio) returning id into r_antonio;
  insert into despesas_recorrentes (descricao, categoria, valor, dia_vencimento, funcionario_id) values ('Salário — Maria', 'funcionarios', 1900, 5, f_maria) returning id into r_maria;
  insert into despesas_recorrentes (descricao, categoria, valor, dia_vencimento) values ('Energia elétrica', 'fixo', 780, 10) returning id into r_energia;
  insert into despesas_recorrentes (descricao, categoria, valor, dia_vencimento) values ('Internet rural', 'fixo', 189, 15) returning id into r_internet;
  insert into despesas_recorrentes (descricao, categoria, valor, dia_vencimento) values ('Arrendamento do Pasto do Fundo', 'fixo', 1800, 20) returning id into r_arrend;
  insert into despesas_recorrentes (descricao, categoria, valor, dia_vencimento, ativo) values ('Assistência técnica', 'outros', 650, 25, false);

  -- Despesas mês a mês
  for k in 0..11 loop
    mes := (inicio + make_interval(months => k))::date;
    -- recorrentes já lançadas (as do mês corrente também: o gerar_recorrentes ignora as repetidas)
    insert into despesas (data, categoria, descricao, valor, recorrente_id, funcionario_id) values
      (mes + 4, 'funcionarios', 'Salário — José', 2600, r_jose, f_jose),
      (mes + 4, 'funcionarios', 'Salário — Antônio', 2400, r_antonio, f_antonio),
      (mes + 4, 'funcionarios', 'Salário — Maria', 1900, r_maria, f_maria);
    insert into despesas (data, categoria, descricao, valor, recorrente_id) values
      (mes + 9, 'fixo', 'Energia elétrica', round((680 + random()::numeric * 260)::numeric, 2), r_energia),
      (mes + 14, 'fixo', 'Internet rural', 189, r_internet);
    if mes + 19 <= hoje then
      insert into despesas (data, categoria, descricao, valor, recorrente_id) values (mes + 19, 'fixo', 'Arrendamento do Pasto do Fundo', 1800, r_arrend);
    end if;
    -- Pedro trabalhou na safra (até maio)
    if mes < date '2026-06-01' then
      insert into despesas (data, categoria, descricao, valor) values (mes + 4, 'funcionarios', 'Salário — Pedro (safra)', 2200);
      update despesas set funcionario_id = (select id from funcionarios where nome = 'Pedro Lima') where descricao = 'Salário — Pedro (safra)' and data = mes + 4;
    end if;
    -- 13º em dezembro
    if extract(month from mes) = 12 then
      insert into despesas (data, categoria, descricao, valor, funcionario_id) values
        (mes + 19, 'funcionarios', '13º salário — José', 2600, f_jose),
        (mes + 19, 'funcionarios', '13º salário — Antônio', 2400, f_antonio),
        (mes + 19, 'funcionarios', '13º salário — Maria', 1900, f_maria);
    end if;

    -- máquinas: diesel todo mês, manutenção de vez em quando
    insert into despesas (data, categoria, descricao, valor, maquina_id) values
      (mes + 11, 'maquinario', 'Diesel — trator', round((900 + random()::numeric * 900)::numeric, 2), m_trator),
      (mes + 13, 'maquinario', 'Combustível — Hilux', round((550 + random()::numeric * 350)::numeric, 2), m_hilux);
    if k in (1, 5, 9) then
      insert into despesas (data, categoria, descricao, valor, maquina_id) values (mes + 17, 'maquinario', 'Revisão do trator', round((1800 + random()::numeric * 1400)::numeric, 2), m_trator);
    end if;
    if k in (3, 8) then
      insert into despesas (data, categoria, descricao, valor, maquina_id) values (mes + 12, 'maquinario', 'Manutenção da roçadeira', round((450 + random()::numeric * 500)::numeric, 2), m_rocadeira);
    end if;
    if k = 7 then
      insert into despesas (data, categoria, descricao, valor, maquina_id) values (mes + 21, 'maquinario', 'Pneus da carreta', 2950, m_carreta);
    end if;

    -- mantimentos e outros
    insert into despesas (data, categoria, descricao, valor) values (mes + 7, 'mantimentos', 'Compras da sede', round((750 + random()::numeric * 500)::numeric, 2));
    if k % 3 = 0 then
      insert into despesas (data, categoria, descricao, valor) values (mes + 18, 'outros', 'Arame, grampos e mourões', round((900 + random()::numeric * 1600)::numeric, 2));
    end if;
    if k % 4 = 2 then
      insert into despesas (data, categoria, descricao, valor) values (mes + 22, 'outros', 'Visita do veterinário', 850);
    end if;
  end loop;

  -- Vacinas e vermífugo antes das campanhas
  insert into despesas (data, categoria, descricao, valor, insumo_id, quantidade) values
    ('2026-04-28', 'outros', 'Vacina febre aftosa', 200 * 2.9, i_vacina, 200),
    ('2026-10-30', 'outros', 'Vacina febre aftosa', 150 * 3.1, i_vacina, 150),
    ('2026-02-15', 'outros', 'Ivermectina 1%', 250 * 1.8, i_verm, 250),
    ('2026-08-01', 'outros', 'Ivermectina 1%', 250 * 1.9, i_verm, 250);

  -- Animais. Compras de garrotes em lotes; nascimentos na maternidade; vendas e abates do confinamento.
  for a in
    select * from (values
      (date '2025-12-08', 46, 'compra', l_sede),
      (date '2026-01-20', 30, 'compra', l_acude),
      (date '2026-03-11', 42, 'compra', l_fundo),
      (date '2026-05-26', 36, 'compra', l_acude),
      (date '2026-08-04', 28, 'compra', l_sede),
      (date '2026-10-14', 24, 'compra', l_fundo)
    ) as t(dia, qtd, tipo, lote)
  loop
    for k in 1..a.qtd loop
      v_peso := round((185 + random()::numeric * 85)::numeric, 1);
      v_valor := round(v_peso * (13.2 + random()::numeric * 1.6), 2);
      v_gmd := 0.55 + random()::numeric * 0.45;
      -- os primeiros lotes foram para o confinamento e saíram vendidos; os mais novos seguem no pasto
      v_saida := null; v_tipo := null; v_lote := a.lote;
      if a.dia < date '2026-04-01' and random()::numeric < 0.72 then
        v_lote := l_conf;
        v_saida := a.dia + (185 + floor(random()::numeric * 120))::int;
        if v_saida > hoje then v_saida := null; end if;
        if v_saida is not null then v_tipo := case when random()::numeric < 0.9 then 'venda' else 'abate' end; end if;
      end if;
      if v_saida is null and random()::numeric < 0.05 then
        v_saida := a.dia + (20 + floor(random()::numeric * 150))::int;
        if v_saida > hoje then v_saida := null; else v_tipo := 'morte'; end if;
      end if;
      insert into animais (brinco, sexo, raca, lote_id, entrada_data, entrada_tipo, entrada_peso, entrada_valor,
                           saida_data, saida_tipo, saida_peso, saida_valor)
      values (lpad(brinco::text, 4, '0'), case when random()::numeric < 0.85 then 'M' else 'F' end, racas[1 + floor(random()::numeric * array_length(racas, 1))::int],
              v_lote, a.dia, 'compra', v_peso, v_valor, v_saida, v_tipo,
              case when v_tipo in ('venda', 'abate') then round(v_peso + (v_saida - a.dia) * (v_gmd + 0.35), 1) end,
              -- venda: peso vivo × 53% de rendimento ÷ 15 kg por arroba × R$ 300–335 a arroba
              case when v_tipo in ('venda', 'abate') then round((v_peso + (v_saida - a.dia) * (v_gmd + 0.35)) * 0.53 / 15 * (300 + random()::numeric * 35), 2) end)
      returning id into v_id;
      brinco := brinco + 1;

      -- pesagens a cada ~60 dias até a saída (ou hoje)
      v_data := a.dia + 60;
      while v_data <= coalesce(v_saida - 5, hoje) loop
        insert into pesagens (animal_id, data, peso)
        values (v_id, v_data, round(v_peso + (v_data - a.dia) * (v_gmd + case when v_lote = l_conf then 0.35 else 0 end) + (random()::numeric - 0.5) * 8, 1));
        v_data := v_data + 55 + floor(random()::numeric * 15)::int;
      end loop;
    end loop;
  end loop;

  -- Vacas de cria e nascimentos
  for k in 1..22 loop
    insert into animais (brinco, sexo, raca, lote_id, entrada_data, entrada_tipo, entrada_peso, entrada_valor)
    values (lpad(brinco::text, 4, '0'), 'F', racas[1 + floor(random()::numeric * array_length(racas, 1))::int], l_mat, date '2025-12-02', 'compra',
            round((390 + random()::numeric * 70)::numeric, 1), round((4200 + random()::numeric * 900)::numeric, 2));
    brinco := brinco + 1;
  end loop;
  for k in 1..19 loop
    v_data := date '2026-07-20' + floor(random()::numeric * 110)::int;
    if v_data > hoje then v_data := hoje - floor(random()::numeric * 10)::int; end if;
    v_peso := round((30 + random()::numeric * 9)::numeric, 1);
    insert into animais (brinco, sexo, raca, lote_id, entrada_data, entrada_tipo, entrada_peso)
    values (lpad(brinco::text, 4, '0'), case when random()::numeric < 0.5 then 'M' else 'F' end, 'Nelore', l_mat, v_data, 'nascimento', v_peso)
    returning id into v_id;
    brinco := brinco + 1;
    if v_data + 45 <= hoje then
      insert into pesagens (animal_id, data, peso) values (v_id, v_data + 45, round(v_peso + 45 * (0.7 + random()::numeric * 0.2), 1));
    end if;
  end loop;

  -- Tratos semanais. Confinamento: ração + silagem + núcleo por cabeça presente; pastos: sal mineral.
  v_data := inicio + 3;
  while v_data <= hoje loop
    select count(*) into k from animais where lote_id = l_conf and entrada_data <= v_data and (saida_data is null or saida_data > v_data);
    if k > 0 then
      insert into tratos (data, lote_id, insumo_id, quantidade) values
        (v_data, l_conf, i_racao, round(k * 7 * 4.2)),
        (v_data, l_conf, i_silagem, round(k * 7 * 9.5));
      if extract(month from v_data) between 5 and 10 then
        insert into tratos (data, lote_id, insumo_id, quantidade) values (v_data, l_conf, i_nucleo, round(k * 7 * 0.9));
      end if;
    end if;
    foreach lote_compra in array array[l_sede, l_acude, l_fundo, l_mat] loop
      select count(*) into k from animais where lote_id = lote_compra and entrada_data <= v_data and (saida_data is null or saida_data > v_data);
      if k > 0 then
        insert into tratos (data, lote_id, insumo_id, quantidade) values (v_data, lote_compra, i_sal, round(k * 7 * 0.08));
      end if;
    end loop;
    v_data := v_data + 7;
  end loop;

  -- Compras de alimento: no começo de cada mês, o que o mês vai consumir (arredondado para cima),
  -- então o estoque nunca fica negativo. Em novembro o sal mineral não foi comprado: fica abaixo do mínimo.
  for k in 0..11 loop
    mes := (inicio + make_interval(months => k))::date;
    for a in
      select t.insumo_id, sum(t.quantidade) as consumo
      from tratos t where t.data >= mes and t.data < (mes + interval '1 month')::date
      group by t.insumo_id
    loop
      v_peso := case a.insumo_id when i_silagem then ceil(a.consumo / 10000) * 10000 when i_racao then ceil(a.consumo / 500) * 500 else ceil(a.consumo / 50) * 50 end;
      continue when a.insumo_id = i_sal and k = 11;
      v_valor := v_peso * case a.insumo_id when i_racao then 2.3 + random()::numeric * 0.2 when i_silagem then 0.31 + random()::numeric * 0.04
                                           when i_sal then 3.5 + random()::numeric * 0.3 else 4.0 + random()::numeric * 0.3 end;
      insert into despesas (data, categoria, descricao, valor, insumo_id, quantidade)
      values (mes, 'alimentacao',
              (select nome from insumos where id = a.insumo_id) || ' — ' || to_char(v_peso, 'FM999G999') || case when a.insumo_id = i_silagem or a.insumo_id = i_racao or a.insumo_id = i_sal or a.insumo_id = i_nucleo then ' kg' else '' end,
              round(v_valor, 2), a.insumo_id, v_peso);
    end loop;
  end loop;

  -- Sanidade: campanhas de aftosa (maio e novembro), vermífugo a cada 3 meses, brucelose e tratamentos
  insert into sanidade (data, tipo, produto, lote_id, proxima_data, observacao)
  select date '2026-05-12', 'vacina', 'Febre aftosa', id, date '2026-11-12', 'Campanha de maio' from lotes;
  insert into sanidade (data, tipo, produto, lote_id, proxima_data, observacao) values
    ('2026-11-13', 'vacina', 'Febre aftosa', l_conf, '2027-05-13', 'Campanha de novembro'),
    ('2026-11-14', 'vacina', 'Febre aftosa', l_sede, '2027-05-14', 'Campanha de novembro'),
    ('2026-11-14', 'vacina', 'Febre aftosa', l_mat, '2027-05-14', 'Campanha de novembro');
  insert into sanidade (data, tipo, produto, lote_id, proxima_data, observacao) values
    ('2026-02-20', 'vermifugo', 'Ivermectina 1%', l_sede, '2026-05-20', '1 ml / 50 kg'),
    ('2026-05-21', 'vermifugo', 'Ivermectina 1%', l_sede, '2026-08-21', '1 ml / 50 kg'),
    ('2026-08-22', 'vermifugo', 'Ivermectina 1%', l_sede, '2026-11-22', '1 ml / 50 kg'),
    ('2026-03-04', 'vermifugo', 'Ivermectina 1%', l_acude, '2026-06-04', '1 ml / 50 kg'),
    ('2026-06-05', 'vermifugo', 'Ivermectina 1%', l_acude, '2026-09-05', '1 ml / 50 kg'),
    ('2026-09-06', 'vermifugo', 'Ivermectina 1%', l_acude, '2026-12-06', '1 ml / 50 kg'),
    ('2026-09-15', 'vermifugo', 'Ivermectina 1%', l_fundo, '2026-12-15', '1 ml / 50 kg'),
    ('2026-09-01', 'vermifugo', 'Doramectina', l_conf, '2026-12-01', 'Entrada no confinamento'),
    ('2026-04-10', 'exame', 'Brucelose e tuberculose', l_mat, '2027-04-10', 'Todas negativas'),
    ('2026-10-02', 'vacina', 'Clostridiose', l_mat, '2026-11-02', 'Reforço em 30 dias');
  insert into sanidade (data, tipo, produto, animal_id, proxima_data, observacao)
  select date '2026-11-19', 'tratamento', 'Antibiótico (pneumonia)', id, date '2026-11-22', '3 doses, a cada 72 h'
  from animais where saida_data is null and lote_id = l_conf order by id limit 1;
  insert into sanidade (data, tipo, produto, animal_id, proxima_data, observacao)
  select date '2026-11-21', 'tratamento', 'Spray cicatrizante (bicheira)', id, date '2026-11-28', 'Repetir se não cicatrizar'
  from animais where saida_data is null and lote_id = l_acude order by id desc limit 1;
end $$;
commit;
