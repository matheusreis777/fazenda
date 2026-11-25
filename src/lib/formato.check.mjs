// Checagem rápida de formato.ts. Rodar: node src/lib/formato.check.mjs
import assert from 'node:assert/strict';

import { hojeIso, num, numParaTexto } from './formato.ts';

assert.equal(num('1500'), 1500);
assert.equal(num('1.500'), 1500);
assert.equal(num('1.500,5'), 1500.5);
assert.equal(num('12,75'), 12.75);
assert.equal(num('1500.5'), 1500.5);
assert.ok(Number.isNaN(num('')));
assert.ok(Number.isNaN(num('abc')));

assert.equal(numParaTexto(1500.5), '1500,5');
assert.equal(num(numParaTexto(1500.5)), 1500.5);

// Dia local, não UTC: 23h de 30/11 continua sendo dia 30.
assert.equal(hojeIso(new Date(2026, 10, 30, 23, 30)), '2026-11-30');
assert.equal(hojeIso(new Date(2026, 0, 5)), '2026-01-05');

console.log('OK: formato');
