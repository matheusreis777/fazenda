// Checagem das contas do painel. Rodar: node src/lib/painel.check.mjs
import assert from 'node:assert/strict';

import { cabecasEm, fimDoMes, marcasDoEixo, mesCurto, somaPorMes, ultimosMeses, variacao } from './painel.ts';

assert.deepEqual(ultimosMeses(3, '2026-01-15'), ['2025-11', '2025-12', '2026-01']);
assert.equal(ultimosMeses(12, '2026-11-25').length, 12);
assert.equal(ultimosMeses(12, '2026-11-25')[0], '2025-12');

assert.equal(fimDoMes('2026-02'), '2026-02-28');
assert.equal(fimDoMes('2028-02'), '2028-02-29');
assert.equal(fimDoMes('2026-12'), '2026-12-31');

const animais = [
  { entrada_data: '2026-01-10', saida_data: null },
  { entrada_data: '2026-01-10', saida_data: '2026-03-01' },
  { entrada_data: '2026-05-01', saida_data: null },
];
assert.equal(cabecasEm(animais, '2026-02-28'), 2);
assert.equal(cabecasEm(animais, '2026-03-01'), 1); // saiu no dia: não conta mais
assert.equal(cabecasEm(animais, '2026-05-01'), 2);

assert.deepEqual(
  somaPorMes(
    [
      { d: '2026-01-05', v: 10 },
      { d: '2026-01-20', v: 5 },
      { d: '2026-03-01', v: 7 },
      { d: null, v: 99 },
      { d: '2025-01-01', v: 99 },
    ],
    ['2026-01', '2026-02', '2026-03'],
    (x) => x.d,
    (x) => x.v,
  ),
  [15, 0, 7],
);

assert.equal(variacao(110, 100), 0.1);
assert.equal(variacao(5, 0), null);

assert.equal(mesCurto('2026-01'), 'jan 26');
assert.equal(mesCurto('2026-11'), 'nov');

assert.deepEqual(marcasDoEixo(153878), [0, 50000, 100000, 150000, 200000]);
assert.deepEqual(marcasDoEixo(7), [0, 2, 4, 6, 8]);
assert.deepEqual(marcasDoEixo(0), [0, 1]);

console.log('OK: painel');
