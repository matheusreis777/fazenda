// Checagem do estado em memória (estoque calculado, salvar e excluir). Rodar: node src/lib/dados.check.mjs
import assert from 'node:assert/strict';

import { excluir, insumoEmUso, lerDados, mesIso, nomeMes, salvar } from './dados.ts';

const saldo = (id) => lerDados().estoque.find((e) => e.id === id).saldo;

// Dados de exemplo: ração = 130 inicial + 2000 comprados − 280 em tratos.
assert.equal(saldo(1), 1850);
assert.equal(saldo(2), 120);

// Trato novo baixa o estoque; editar e excluir corrigem o saldo.
await salvar('tratos', { data: '2026-11-24', lote_id: 1, insumo_id: 1, quantidade: 50 });
assert.equal(saldo(1), 1800);
const novo = lerDados().tratos[0];
assert.equal(novo.quantidade, 50);
assert.equal(novo.insumo, 'Ração de engorda');
await salvar('tratos', { id: novo.id, quantidade: 80 });
assert.equal(saldo(1), 1770);
await excluir('tratos', novo.id);
assert.equal(saldo(1), 1850);

// Compra soma; trocar a compra de insumo move a quantidade de um saldo para o outro.
await salvar('despesas', { data: '2026-11-24', categoria: 'alimentacao', descricao: 'sal', valor: 350, insumo_id: 2, quantidade: 100 });
assert.equal(saldo(2), 220);
const compra = lerDados().despesas[0];
await salvar('despesas', { id: compra.id, insumo_id: 4 });
assert.equal(saldo(2), 120);
assert.equal(saldo(4), 118);
await excluir('despesas', compra.id);
assert.equal(saldo(4), 18);

// Editar altera só os campos informados.
await salvar('animais', { id: 1, lote_id: 3 });
const animal = lerDados().animais.find((a) => a.id === 1);
assert.equal(animal.lote_id, 3);
assert.equal(animal.brinco, '0101');

assert.equal(insumoEmUso(1), true);
assert.equal(insumoEmUso(4), false);

console.log('OK: dados');

// Lotes: criar, renomear, e só excluir quando não tem animais nem tratos.
const { loteEmUso, nomeLote } = await import('./dados.ts');
await salvar('lotes', { nome: 'Pasto Novo' });
const loteNovo = lerDados().lotes[0];
assert.equal(loteNovo.nome, 'Pasto Novo');
await salvar('lotes', { id: loteNovo.id, nome: 'Pasto do Fundo' });
assert.equal(nomeLote(lerDados().lotes, loteNovo.id), 'Pasto do Fundo');
assert.equal(loteEmUso(loteNovo.id), false);
assert.equal(loteEmUso(2), true);
await excluir('lotes', loteNovo.id);
assert.equal(nomeLote(lerDados().lotes, loteNovo.id), '—');
console.log('OK: lotes');

// Meses: virada de ano e nome por extenso.
assert.equal(mesIso(0, new Date(2026, 10, 25)), '2026-11');
assert.equal(mesIso(2, new Date(2026, 10, 25)), '2027-01');
assert.equal(mesIso(-11, new Date(2026, 10, 25)), '2025-12');
assert.equal(nomeMes('2026-11'), 'Novembro de 2026');
console.log('OK: meses');

// Pesagens: peso atual e ganho médio diário a partir da entrada.
const { dias, evolucaoPeso, proximosManejos, somarDias, funcionarioEmUso, maquinaEmUso } = await import('./dados.ts');
assert.equal(dias('2026-01-15', '2026-11-01'), 290);
assert.equal(dias('2026-02-28', '2026-03-01'), 1);
assert.equal(somarDias('2026-12-25', 10), '2027-01-04');
const boi = { id: 77, entrada_data: '2026-01-01', entrada_peso: 300 };
assert.deepEqual(evolucaoPeso(boi, []), { peso: 300, data: '2026-01-01', gmd: null });
const ev = evolucaoPeso(boi, [
  { id: 1, animal_id: 77, data: '2026-03-02', peso: 360 },
  { id: 2, animal_id: 77, data: '2026-01-31', peso: 330 },
  { id: 3, animal_id: 99, data: '2026-05-01', peso: 999 },
]);
assert.equal(ev.peso, 360);
assert.equal(ev.gmd, 1); // 60 kg em 60 dias

// Sanidade: só a aplicação mais recente de cada produto/alvo conta; atrasadas entram, futuras distantes não.
const manejos = proximosManejos(
  [
    { id: 1, data: '2026-05-10', produto: 'Aftosa', animal_id: null, lote_id: 1, proxima_data: '2026-11-10' },
    { id: 2, data: '2026-11-12', produto: 'aftosa ', animal_id: null, lote_id: 1, proxima_data: '2027-05-12' },
    { id: 3, data: '2026-05-10', produto: 'Aftosa', animal_id: null, lote_id: 2, proxima_data: '2026-11-10' },
    { id: 4, data: '2026-11-01', produto: 'Brucelose', animal_id: 5, lote_id: null, proxima_data: null },
  ],
  '2026-12-25',
);
assert.deepEqual(manejos.map((m) => m.id), [3]);

assert.equal(funcionarioEmUso(1), true);
assert.equal(maquinaEmUso(2), true);
console.log('OK: pesagens e sanidade');

// Criar lote de dentro de outro formulário: devolve o id; nome repetido reaproveita o existente.
const { criarLote } = await import('./dados.ts');
const r1 = await criarLote('  Pasto Novo do Teste ');
assert.ok('valor' in r1);
assert.equal(lerDados().lotes.find((l) => String(l.id) === r1.valor).nome, 'Pasto Novo do Teste');
const r2 = await criarLote('pasto novo do teste');
assert.equal(r2.valor, r1.valor);
assert.deepEqual(await criarLote('   '), { erro: 'Digite o nome do lote.' });
console.log('OK: criar lote');

// Ações em lote: brincos em sequência, rateio exato em centavos e várias gravações numa chamada.
const { faixaBrincos, ratear, salvarVarios } = await import('./dados.ts');
assert.deepEqual(faixaBrincos('0198', 3), ['0198', '0199', '0200']);
assert.deepEqual(faixaBrincos(' 0999 ', 2), ['0999', '1000']);
assert.deepEqual(faixaBrincos('99', 2), ['99', '100']);
assert.deepEqual(faixaBrincos('105000000000001', 2), ['105000000000001', '105000000000002']);
assert.equal(faixaBrincos('A12', 2), null);
assert.equal(faixaBrincos('12', 0), null);
assert.equal(faixaBrincos('12', 1.5), null);
const tres = ratear(10000, [1, 1, 1]);
assert.deepEqual(tres, [3333.33, 3333.33, 3333.34]);
assert.equal(Math.round(tres.reduce((s, v) => s + v, 0) * 100), 1000000);
assert.deepEqual(ratear(1000, [300, 200]), [600, 400]);
assert.deepEqual(ratear(100, [0, 0]), [50, 50]);
assert.deepEqual(ratear(5, []), []);

const antes = lerDados().animais.length;
const semSaida = { saida_data: null, saida_tipo: null, saida_valor: null };
const novoAnimal = (brinco) => ({ brinco, sexo: 'M', raca: 'Nelore', lote_id: 1, entrada_tipo: 'compra', entrada_data: '2026-11-20', entrada_peso: 200, ...semSaida });
await salvarVarios('animais', ['0301', '0302', '0303'].map(novoAnimal));
assert.equal(lerDados().animais.length, antes + 3);
const criados = lerDados().animais.filter((a) => a.brinco === '0301' || a.brinco === '0302');
await salvarVarios('animais', criados.map((a) => ({ id: a.id, lote_id: 2 })));
assert.deepEqual(
  lerDados().animais.filter((a) => a.brinco.startsWith('030')).map((a) => [a.brinco, a.lote_id]).sort(),
  [['0301', 2], ['0302', 2], ['0303', 1]],
);
console.log('OK: ações em lote');

// GTA: idade em meses, faixas por sexo e bezerras sem vacina de brucelose.
const { idadeMeses, resumoGta, pendentesBrucelose, nascimentoDe } = await import('./dados.ts');
assert.equal(idadeMeses('2026-05-20', '2026-11-25'), 6);
assert.equal(idadeMeses('2026-05-31', '2026-06-30'), 0);
assert.equal(idadeMeses('2025-12-15', '2026-12-15'), 12);
assert.equal(idadeMeses('2025-12-16', '2026-12-15'), 11);

const bicho = (id, sexo, extra) => ({ id, sexo, lote_id: 1, entrada_tipo: 'compra', entrada_data: '2026-01-01', saida_data: null, nascimento: null, ...extra });
assert.equal(nascimentoDe(bicho(1, 'F', { entrada_tipo: 'nascimento', entrada_data: '2026-03-01' })), '2026-03-01');
assert.equal(nascimentoDe(bicho(1, 'F', {})), null);
const r = resumoGta(
  [
    bicho(1, 'M', { nascimento: '2026-01-10' }), // 10 meses
    bicho(2, 'F', { nascimento: '2025-11-25' }), // 12 meses: ainda na primeira faixa
    bicho(3, 'F', { nascimento: '2025-11-26' }), // 11 meses
    bicho(4, 'M', { nascimento: '2024-01-01' }), // 34 meses
    bicho(5, 'M', { nascimento: '2020-01-01' }),
    bicho(6, 'F', {}), // sem idade
  ],
  '2026-11-25',
);
assert.deepEqual(r.faixas.map((f) => [f.machos, f.femeas]), [[1, 2], [0, 0], [1, 0], [1, 0]]);
assert.deepEqual(r.semIdade, { machos: 0, femeas: 1 });

const bezerras = [
  bicho(10, 'F', { nascimento: '2026-05-20' }), // 6 meses, sem vacina: pendente
  bicho(11, 'F', { nascimento: '2026-05-20' }), // vacinada no animal
  bicho(12, 'F', { nascimento: '2026-05-20', lote_id: 2 }), // vacinada no lote depois do nascimento
  bicho(13, 'F', { nascimento: '2026-09-10' }), // 2 meses: ainda não
  bicho(14, 'F', { nascimento: '2026-02-01' }), // 9 meses: passou
  bicho(15, 'M', { nascimento: '2026-05-20' }), // macho
  bicho(16, 'F', { nascimento: '2026-05-20', lote_id: 3 }), // só exame no lote: continua pendente
  bicho(17, 'F', { nascimento: '2026-05-20', saida_data: '2026-11-01' }), // já saiu
];
const vacinas = [
  { id: 1, tipo: 'vacina', produto: 'Brucelose (B19)', animal_id: 11, lote_id: null, data: '2026-09-01' },
  { id: 2, tipo: 'vacina', produto: 'rb51', animal_id: null, lote_id: 2, data: '2026-09-01' },
  { id: 3, tipo: 'exame', produto: 'Brucelose', animal_id: null, lote_id: 3, data: '2026-09-01' },
  { id: 4, tipo: 'vacina', produto: 'Febre aftosa', animal_id: 10, lote_id: null, data: '2026-09-01' },
];
assert.deepEqual(pendentesBrucelose(bezerras, vacinas, '2026-11-25').map((p) => [p.animal.id, p.meses]), [[10, 6], [16, 6]]);
console.log('OK: GTA e brucelose');
