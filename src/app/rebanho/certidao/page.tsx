'use client';

import clsx from 'clsx';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

import { Botao, Icone, Tela, Trilha } from '@/components/ui';
import { dataCurta, kgPorDia, montarCertidao, pesoExtenso, porArroba, tempoExtenso } from '@/lib/certidao';
import { dias, nascimentoDe, nomeLote, reais, TIPOS_SANIDADE, useDados } from '@/lib/dados';
import { hojeIso } from '@/lib/formato';

const ENTRADA = { compra: 'Comprado', nascimento: 'Nasceu na fazenda' } as const;
const SAIDA = { venda: 'Venda', abate: 'Abate', morte: 'Morte' } as const;
const sinal = (v: number, unidade: string, casas = 1) =>
  `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: casas > 1 ? casas : 0, maximumFractionDigits: casas })} ${unidade}`;

/** Parte do documento: título em versalete e o conteúdo. Não quebra no meio ao imprimir. */
function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 break-inside-avoid">
      <h3 className="border-b border-borda pb-1 text-xs font-bold tracking-[0.2em] text-texto-2 uppercase">{titulo}</h3>
      {children}
    </section>
  );
}

/** Pares rótulo → valor em duas colunas (uma no celular). Valor vazio aparece como "Não informado". */
function Dados({ itens }: { itens: (readonly [string, ReactNode] | false)[] }) {
  return (
    <dl className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
      {itens.filter((i) => i !== false).map(([rotulo, valor]) => (
        <div key={rotulo} className="flex flex-col">
          <dt className="text-xs font-semibold text-texto-2">{rotulo}</dt>
          <dd className={clsx('font-semibold', valor == null && 'font-medium text-texto-2')}>{valor ?? 'Não informado'}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Certidão de um animal (/rebanho/certidao?animal=ID): tudo o que o sistema sabe dele, pronto para imprimir ou salvar em PDF. */
export default function CertidaoAnimal() {
  const { animais, lotes, pesagens, sanidade, nomeFazenda } = useDados();
  const router = useRouter();
  const id = Number(useSearchParams().get('animal'));
  const animal = animais.find((a) => a.id === id);

  if (!animal) {
    return (
      <Tela>
        <p className="font-medium text-texto-2">Animal não encontrado. Ele pode ter sido excluído.</p>
        <Botao titulo="Ir para o Rebanho" secundario onClick={() => router.push('/rebanho')} className="self-start" />
      </Tela>
    );
  }

  const c = montarCertidao(animal, lotes, pesagens, sanidade, hojeIso());
  const lote = nomeLote(lotes, animal.lote_id);
  const agora = new Date();
  const compraArroba = porArroba(c.compra, animal.entrada_peso);
  const vendaArroba = porArroba(c.venda, animal.saida_peso);
  const nascimento = nascimentoDe(animal);
  // Volta para onde o animal aparece: o lote dele ou a lista dos que saíram.
  const voltar = () => router.push(animal.saida_data ? '/rebanho?saidas' : `/rebanho?lote=${animal.lote_id}`);

  return (
    <Tela>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="min-w-0">
          <Trilha raiz="Rebanho" onVoltar={voltar} aqui={`Certidão do brinco ${animal.brinco}`} />
        </div>
        <Botao titulo="Imprimir / salvar PDF" onClick={() => window.print()} />
      </div>

      {/* Folha: moldura dupla, como papel timbrado. Na impressão vira a página inteira. */}
      <article className="mx-auto w-full max-w-3xl rounded-sm border border-borda bg-cartao p-1.5 shadow-sm print:max-w-none print:border-0 print:p-0 print:shadow-none">
        <div className="flex flex-col gap-7 border-4 border-double border-borda px-5 py-8 sm:px-10 sm:py-10 print:border-texto-2">
          <header className="flex flex-col items-center gap-1 text-center">
            <Icone nome="rebanho" className="mb-1 size-10 text-texto-2" />
            <p className="text-xs font-bold tracking-[0.35em] text-texto-2 uppercase">{nomeFazenda || 'Fazenda'}</p>
            <h2 className="font-serif text-3xl font-bold sm:text-4xl">Certidão do animal</h2>
            <p className="mt-1 text-lg font-semibold">Brinco nº {animal.brinco}</p>
            <p className="text-sm font-medium text-texto-2">
              Registro nº {String(animal.id).padStart(6, '0')} · {c.situacao}
            </p>
          </header>

          <p className="text-justify font-serif text-[17px] leading-relaxed indent-8 hyphens-auto">{c.texto}</p>

          <Bloco titulo="Identificação">
            <Dados
              itens={[
                ['Brinco', animal.brinco],
                ['Sexo', animal.sexo === 'M' ? 'Macho' : 'Fêmea'],
                ['Raça', animal.raca || null],
                [animal.saida_data ? 'Lote na saída' : 'Lote atual', lote],
                ['Situação', c.situacao],
                ['Nascimento', nascimento ? dataCurta(nascimento) : null],
                ['Idade', nascimento ? tempoExtenso(Math.max(dias(nascimento, animal.saida_data ?? hojeIso()), 0)) : null],
                animal.entrada_tipo === 'compra' && ['Tempo na propriedade', `${c.tempo} (${c.dias.toLocaleString('pt-BR')} dias)`],
              ]}
            />
          </Bloco>

          <Bloco titulo="Entrada">
            <Dados
              itens={[
                ['Como chegou', ENTRADA[animal.entrada_tipo]],
                ['Data', dataCurta(animal.entrada_data)],
                ['Peso', pesoExtenso(animal.entrada_peso)],
                animal.entrada_tipo === 'compra' && ['Valor pago', c.compra ? reais(c.compra) : null],
                compraArroba !== null && ['Valor por arroba', `${reais(compraArroba)}/@`],
                animal.entrada_tipo === 'compra' && ['GTA', animal.entrada_gta || null],
              ]}
            />
          </Bloco>

          {animal.saida_data && (
            <Bloco titulo="Saída">
              <Dados
                itens={[
                  ['Motivo', SAIDA[animal.saida_tipo!]],
                  ['Data', dataCurta(animal.saida_data)],
                  ['Peso', animal.saida_peso ? pesoExtenso(animal.saida_peso) : null],
                  animal.saida_tipo !== 'morte' && ['Valor recebido', c.venda ? reais(c.venda) : null],
                  vendaArroba !== null && ['Valor por arroba', `${reais(vendaArroba)}/@`],
                  animal.saida_tipo !== 'morte' && ['GTA', animal.saida_gta || null],
                ]}
              />
            </Bloco>
          )}

          <Bloco titulo="Pesos">
            {/* Tabela rola para o lado no celular; no papel cabe inteira. */}
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full min-w-[28rem] text-left text-sm tabular-nums">
                <thead>
                  <tr className="text-xs text-texto-2">
                    <th className="py-1.5 pr-3 font-semibold">Data</th>
                    <th className="py-1.5 pr-3 font-semibold">Registro</th>
                    <th className="py-1.5 pr-3 text-right font-semibold">Peso</th>
                    <th className="py-1.5 pr-3 text-right font-semibold">Ganho</th>
                    <th className="py-1.5 text-right font-semibold">Por dia</th>
                  </tr>
                </thead>
                <tbody>
                  {c.pesos.map((p, i) => (
                    <tr key={`${p.data}-${i}`} className="border-t border-borda">
                      <td className="py-1.5 pr-3">{dataCurta(p.data)}</td>
                      <td className="py-1.5 pr-3">{p.rotulo}</td>
                      <td className="py-1.5 pr-3 text-right font-semibold">{pesoExtenso(p.peso)}</td>
                      <td className="py-1.5 pr-3 text-right">{p.ganho === null ? '—' : sinal(p.ganho, 'kg')}</td>
                      <td className="py-1.5 text-right">{p.gmd === null ? '—' : sinal(p.gmd, 'kg', 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {c.ganhoTotal !== null && (
              <p className="text-sm font-medium">
                Ganho total: <strong>{sinal(c.ganhoTotal, 'kg')}</strong>
                {c.gmdTotal !== null && (
                  <>
                    {' '}
                    · média de <strong>{kgPorDia(c.gmdTotal)}</strong>
                  </>
                )}
              </p>
            )}
          </Bloco>

          <Bloco titulo="Sanidade">
            {c.sanidade.length === 0 ? (
              <p className="text-sm font-medium text-texto-2">Nenhum registro.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-borda text-sm">
                {c.sanidade.map((s) => (
                  <li key={s.id} className="flex gap-4 py-2 break-inside-avoid">
                    <span className="w-20 shrink-0 tabular-nums">{dataCurta(s.data)}</span>
                    <span className="flex min-w-0 flex-col">
                      <span className="font-semibold">
                        {TIPOS_SANIDADE[s.tipo]}: {s.produto}
                      </span>
                      <span className="text-texto-2">
                        {s.alvo}
                        {s.proxima_data && ` · próxima em ${dataCurta(s.proxima_data)}`}
                      </span>
                      {s.observacao && <span className="text-texto-2">Obs.: {s.observacao}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs font-medium text-texto-2">
              Inclui o que foi aplicado no animal e no lote em que ele está ({lote}) enquanto ele esteve na fazenda.
            </p>
          </Bloco>

          {(c.compra !== null || c.venda !== null) && (
            <Bloco titulo="Valores">
              <Dados
                itens={[
                  ['Compra', c.compra !== null ? reais(c.compra) : null],
                  ['Venda', c.venda !== null ? reais(c.venda) : null],
                  c.resultado !== null && ['Diferença (venda − compra)', <span key="resultado" className={clsx(c.resultado < 0 && 'text-alerta')}>{reais(c.resultado)}</span>],
                ]}
              />
              <p className="text-xs font-medium text-texto-2">Sem rateio de gastos da fazenda (ração, mão de obra, remédios).</p>
            </Bloco>
          )}

          {/* Assinaturas e emissão */}
          <footer className="mt-4 flex flex-col gap-8 break-inside-avoid">
            <div className="grid gap-10 sm:grid-cols-2">
              {['Responsável pela fazenda', 'Local e data'].map((r) => (
                <div key={r} className="flex flex-col items-center gap-1">
                  <span aria-hidden="true" className="h-10 w-full border-b border-texto-2" />
                  <span className="text-xs font-semibold text-texto-2">{r}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-xs font-medium text-texto-2">
              {nomeFazenda && <span className="block font-bold text-texto">{nomeFazenda}</span>}
              Emitida em {agora.toLocaleDateString('pt-BR')} às {agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} pelo sistema da
              fazenda, com os lançamentos feitos até esta data. Documento de controle interno: não substitui GTA, nota fiscal ou outros documentos
              oficiais.
            </p>
          </footer>
        </div>
      </article>
    </Tela>
  );
}
