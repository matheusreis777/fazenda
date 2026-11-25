// Checagem da certidão do animal. Rodar: node src/lib/certidao.check.mjs
import assert from 'node:assert/strict';

import { montarCertidao, tempoExtenso } from './certidao.ts';

const lotes = [{ id: 1, nome: 'Pasto da Sede' }];
const sanidade = [
  { id: 1, data: '2026-02-01', tipo: 'vacina', produto: 'Aftosa', animal_id: null, lote_id: 1, proxima_data: null, observacao: null },
  { id: 2, data: '2025-05-01', tipo: 'vacina', produto: 'Aftosa', animal_id: null, lote_id: 1, proxima_data: null, observacao: null }, // antes da entrada
  { id: 3, data: '2026-03-10', tipo: 'tratamento', produto: 'Antibiótico', animal_id: 7, lote_id: null, proxima_data: null, observacao: null },
  { id: 4, data: '2026-03-10', tipo: 'vacina', produto: 'Raiva', animal_id: 99, lote_id: null, proxima_data: null, observacao: null }, // outro animal
];

// Comprado, pesado e vendido.
const boi = {
  id: 7, brinco: '0098', sexo: 'M', raca: 'Nelore', lote_id: 1,
  entrada_data: '2025-11-03', entrada_tipo: 'compra', entrada_peso: 360, entrada_valor: 3600,
  saida_data: '2026-11-10', saida_tipo: 'venda', saida_peso: 540, saida_valor: 5850,
};
const pesagens = [
  { id: 1, animal_id: 7, data: '2026-05-02', peso: 450 },
  { id: 2, animal_id: 8, data: '2026-05-02', peso: 999 },
];
const c = montarCertidao(boi, lotes, pesagens, sanidade, '2026-11-25');
assert.deepEqual(c.pesos.map((p) => p.peso), [360, 450, 540]);
assert.equal(c.pesos[1].ganho, 90);
assert.equal(c.pesos[1].gmd, 0.5); // 90 kg em 180 dias
assert.equal(c.ganhoTotal, 180);
assert.deepEqual(c.sanidade.map((s) => s.id), [1, 3]); // a do lote depois da entrada e a do próprio animal
assert.equal(c.sanidade[0].alvo, 'No lote Pasto da Sede');
assert.equal(c.resultado, 2250);
assert.equal(c.situacao, 'Vendido em 10/11/2026');
assert.match(c.texto, /por compra em 3 de novembro de 2025, pesando 360 kg \(12 @\), adquirido por R\$\s3\.600,00/);
assert.match(c.texto, /Foi vendido em 10 de novembro de 2026, com 540 kg \(18 @\), por R\$\s5\.850,00/);
assert.match(c.texto, /Constam 2 registros sanitários/);

// Nasceu na fazenda e continua no rebanho, sem pesagens nem valores.
const bezerra = { ...boi, id: 8, sexo: 'F', entrada_tipo: 'nascimento', entrada_peso: 34, entrada_valor: null, entrada_data: '2026-05-20', saida_data: null, saida_tipo: null, saida_peso: null, saida_valor: null };
const b = montarCertidao(bezerra, lotes, [], [], '2026-11-25');
assert.equal(b.situacao, 'No rebanho');
assert.equal(b.ganhoTotal, null);
assert.equal(b.resultado, null);
assert.match(b.texto, /fêmea, da raça Nelore, nasceu nesta propriedade em 20 de maio de 2026/);
assert.match(b.texto, /Não há pesagens/);
assert.match(b.texto, /encontra-se no lote Pasto da Sede, há 6 meses na propriedade/);

assert.equal(tempoExtenso(1), '1 dia');
assert.equal(tempoExtenso(800), '2 anos e 2 meses');
console.log('OK: certidão');
