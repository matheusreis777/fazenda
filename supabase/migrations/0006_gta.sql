-- Número da GTA (Guia de Trânsito Animal) que acompanhou o animal na chegada (compra) e na saída
-- (venda ou abate). A GTA é emitida no sistema do órgão estadual; aqui só fica o número para consulta.
alter table animais
  add column entrada_gta text check (char_length(entrada_gta) <= 100),
  add column saida_gta text check (char_length(saida_gta) <= 100);
