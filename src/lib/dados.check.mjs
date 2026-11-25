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
