// Certidão do animal: junta tudo o que o sistema sabe de um animal (entrada, pesagens, sanidade, saída, valores)
// e escreve o texto corrido do documento. Sem React: certidao.check.mjs roda este arquivo direto no Node
// (por isso os imports com ".ts").
import { type Animal, dias, type Lote, nomeLote, type Pesagem, reais, type Sanidade } from './dados.ts';
import { kgParaArroba } from './formato.ts';

export type LinhaPeso = {
  data: string;
  /** 'Entrada (compra)', 'Nascimento', 'Pesagem', 'Saída (venda)'… */
  rotulo: string;
  peso: number;
  /** Diferença para a linha anterior (null na primeira). */
  ganho: number | null;
  /** Ganho por dia desde a linha anterior. */
  gmd: number | null;
};

export type Certidao = {
  /** 'No rebanho', 'Vendido em 10/11/2026'… */
  situacao: string;
  /** Texto corrido, no estilo de certidão. */
  texto: string;
  /** Dias na propriedade: até hoje, ou até a saída. */
  dias: number;
  tempo: string;
  pesos: LinhaPeso[];
  /** Da entrada até o último peso conhecido (null se só há o peso de entrada). */
  ganhoTotal: number | null;
  gmdTotal: number | null;
  /** Aplicações no animal e no lote dele (com o nome de onde foi aplicada). */
  sanidade: (Sanidade & { alvo: string })[];
  compra: number | null;
  venda: number | null;
  /** Venda − compra, só com os dois valores. */
  resultado: number | null;
};

const SAIDA = { venda: 'venda', abate: 'abate', morte: 'morte' } as const;
const SITUACAO = { venda: 'Vendido', abate: 'Abatido', morte: 'Morto' } as const;

/** '2026-03-12' → '12 de março de 2026' */
export const dataExtenso = (iso: string) =>
  new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
/** '2026-03-12' → '12/03/2026' */
export const dataCurta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

const decimal = (v: number, casas = 1) => v.toLocaleString('pt-BR', { maximumFractionDigits: casas });
/** 352 → '352 kg (11,7 @)' */
export const pesoExtenso = (kg: number) => `${decimal(kg)} kg (${decimal(kgParaArroba(kg))} @)`;
export const kgPorDia = (v: number) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg por dia`;

/** 45 → '45 dias'; 250 → '8 meses'; 800 → '2 anos e 2 meses' */
export function tempoExtenso(d: number): string {
  if (d < 60) return `${d} ${d === 1 ? 'dia' : 'dias'}`;
  const meses = Math.floor(d / 30.44);
  if (meses < 24) return `${meses} meses`;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  return `${anos} anos${resto ? ` e ${resto} ${resto === 1 ? 'mês' : 'meses'}` : ''}`;
}

/** Valor por arroba (R$/@), quando há peso e valor. */
export const porArroba = (valor: number | null | undefined, kg: number | null | undefined) => (valor && kg ? valor / kgParaArroba(kg) : null);

export function montarCertidao(animal: Animal, lotes: Lote[], pesagens: Pesagem[], sanidade: Sanidade[], hoje: string): Certidao {
  const fim = animal.saida_data ?? hoje;
  const diasNaFazenda = Math.max(dias(animal.entrada_data, fim), 0);
  const tempo = tempoExtenso(diasNaFazenda);
  const lote = nomeLote(lotes, animal.lote_id);

  // Pesos: entrada, cada pesagem (em ordem) e o peso de saída, se houver; ganho e média por dia entre uma e outra.
  const brutas: Omit<LinhaPeso, 'ganho' | 'gmd'>[] = [
    { data: animal.entrada_data, rotulo: animal.entrada_tipo === 'compra' ? 'Entrada (compra)' : 'Nascimento', peso: animal.entrada_peso },
    ...pesagens
      .filter((p) => p.animal_id === animal.id && p.data >= animal.entrada_data)
      .sort((a, b) => a.data.localeCompare(b.data) || a.id - b.id)
      .map((p) => ({ data: p.data, rotulo: 'Pesagem', peso: p.peso })),
    ...(animal.saida_data && animal.saida_peso ? [{ data: animal.saida_data, rotulo: `Saída (${SAIDA[animal.saida_tipo!]})`, peso: animal.saida_peso }] : []),
  ];
  const pesos = brutas.map((l, i) => {
    if (i === 0) return { ...l, ganho: null, gmd: null };
    const antes = brutas[i - 1];
    const ganho = l.peso - antes.peso;
    const periodo = dias(antes.data, l.data);
    return { ...l, ganho, gmd: periodo > 0 ? ganho / periodo : null };
  });
  const ultimo = pesos[pesos.length - 1];
  const ganhoTotal = pesos.length > 1 ? ultimo.peso - animal.entrada_peso : null;
  const periodoTotal = dias(animal.entrada_data, ultimo.data);
  const gmdTotal = ganhoTotal !== null && periodoTotal > 0 ? ganhoTotal / periodoTotal : null;

  // Sanidade: o que foi aplicado no animal e no lote dele, enquanto ele estava na fazenda.
  // ponytail: o sistema só sabe o lote atual (não guarda por onde o animal passou); se ele mudou de lote,
  // as aplicações do lote antigo não aparecem e as do lote atual de antes da mudança aparecem. Guardar o histórico de lotes resolve.
  const daSanidade = sanidade
    .filter(
      (s) =>
        s.animal_id === animal.id || (s.lote_id === animal.lote_id && s.data >= animal.entrada_data && s.data <= fim),
    )
    .sort((a, b) => a.data.localeCompare(b.data) || a.id - b.id)
    .map((s) => ({ ...s, alvo: s.animal_id ? 'No animal' : `No lote ${lote}` }));

  const compra = animal.entrada_valor ?? null;
  const venda = animal.saida_tipo === 'venda' || animal.saida_tipo === 'abate' ? (animal.saida_valor ?? null) : null;

  // ---------- Texto corrido ----------
  const partes: string[] = [];
  const identificacao = `o animal identificado pelo brinco nº ${animal.brinco}, ${animal.sexo === 'M' ? 'macho' : 'fêmea'}, da raça ${animal.raca || 'não informada'}`;
  if (animal.entrada_tipo === 'compra') {
    partes.push(
      `Certificamos, para os devidos fins, que ${identificacao}, deu entrada nesta propriedade por compra em ${dataExtenso(animal.entrada_data)}, pesando ${pesoExtenso(animal.entrada_peso)}${compra ? `, adquirido por ${reais(compra)}` : ''}.`,
    );
  } else {
    partes.push(`Certificamos, para os devidos fins, que ${identificacao}, nasceu nesta propriedade em ${dataExtenso(animal.entrada_data)}, pesando ${pesoExtenso(animal.entrada_peso)} ao nascer.`);
  }

  const pesagensFeitas = pesos.filter((p) => p.rotulo === 'Pesagem');
  if (pesagensFeitas.length) {
    const u = pesagensFeitas[pesagensFeitas.length - 1];
    const ganhoAteU = u.peso - animal.entrada_peso;
    const diasAteU = dias(animal.entrada_data, u.data);
    partes.push(
      `Foi pesado ${pesagensFeitas.length === 1 ? 'uma vez' : `${pesagensFeitas.length} vezes`}; na última pesagem, em ${dataExtenso(u.data)}, pesava ${pesoExtenso(u.peso)}, ` +
        `${ganhoAteU >= 0 ? 'um ganho' : 'uma perda'} de ${decimal(Math.abs(ganhoAteU))} kg desde a entrada${diasAteU > 0 ? ` (média de ${kgPorDia(ganhoAteU / diasAteU)})` : ''}.`,
    );
  } else {
    partes.push('Não há pesagens registradas depois da entrada.');
  }

  if (!animal.saida_data) {
    partes.push(`Na data desta certidão, encontra-se no lote ${lote}, há ${tempo} na propriedade.`);
  } else if (animal.saida_tipo === 'morte') {
    partes.push(`Morreu em ${dataExtenso(animal.saida_data)}, após ${tempo} na propriedade, quando estava no lote ${lote}.`);
  } else {
    const verbo = animal.saida_tipo === 'venda' ? 'vendido' : 'abatido';
    partes.push(
      `Foi ${verbo} em ${dataExtenso(animal.saida_data)}${animal.saida_peso ? `, com ${pesoExtenso(animal.saida_peso)}` : ''}${venda ? `, por ${reais(venda)}` : ''}, após ${tempo} na propriedade, quando estava no lote ${lote}.`,
    );
  }

  partes.push(
    daSanidade.length
      ? `Constam ${daSanidade.length === 1 ? 'um registro sanitário' : `${daSanidade.length} registros sanitários`} (vacinas, vermífugos, tratamentos e exames), relacionados abaixo.`
      : 'Não constam registros sanitários.',
  );
  partes.push('E, por ser verdade, firmamos a presente.');

  return {
    situacao: animal.saida_data ? `${SITUACAO[animal.saida_tipo!]} em ${dataCurta(animal.saida_data)}` : 'No rebanho',
    texto: partes.join(' '),
    dias: diasNaFazenda,
    tempo,
    pesos,
    ganhoTotal,
    gmdTotal,
    sanidade: daSanidade,
    compra,
    venda,
    resultado: compra !== null && venda !== null ? venda - compra : null,
  };
}
