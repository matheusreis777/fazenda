-- Apaga os dados de demonstração gravados por exemplo.sql no projeto em 25/11/2026,
-- pelas faixas de id que eles ocuparam. O que você cadastrar depois (ids maiores) fica.
-- Ordem: primeiro quem aponta para os outros.
begin;
delete from sanidade where id between 25 and 44;
delete from pesagens where id between 568 and 1123;
delete from tratos where id between 310 and 617;
delete from despesas where id between 316 and 490;
delete from despesas_recorrentes where id between 19 and 25;
delete from animais where id between 253 and 499;
delete from insumos where id between 15 and 20;
delete from funcionarios where id between 10 and 13;
delete from maquinas where id between 10 and 13;
delete from lotes where id between 17 and 21;
commit;
