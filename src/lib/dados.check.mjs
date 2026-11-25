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
