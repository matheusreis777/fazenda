'use client';

import { useState } from 'react';

import { Formulario } from '@/components/formulario';
import { Botao, Cartao, Chip, Chips, Etiqueta, Grade, Linha, Secao, Tela, Vazio } from '@/components/ui';
import { CATEGORIAS, type Categoria, type Despesa, diaMes, excluir, mesIso, nomeMes, reais, type Recorrente, salvar, useDados } from '@/lib/dados';
import { num, numParaTexto } from '@/lib/formato';

const OPCOES_CATEGORIA = (Object.keys(CATEGORIAS) as Categoria[]).map((c) => ({ valor: c, rotulo: CATEGORIAS[c] }));

export default function Financeiro() {
  const { despesas, recorrentes, estoque } = useDados();
  // { item } = editando aquele registro; {} = novo; null = fechado.
  const [formDespesa, setFormDespesa] = useState<{ item?: Despesa } | null>(null);
  const [formRecorrente, setFormRecorrente] = useState<{ item?: Recorrente } | null>(null);
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  // 0 = mês atual; -1 = mês passado…
  const [deslocamento, setDeslocamento] = useState(0);
  const mes = mesIso(deslocamento);

  const doMes = despesas.filter((d) => d.data.startsWith(mes));
  const lista = doMes.filter((d) => categoria === null || d.categoria === categoria);
  const total = doMes.reduce((s, d) => s + d.valor, 0);
  const totalRecorrente = recorrentes.filter((r) => r.ativo).reduce((s, r) => s + r.valor, 0);
  const totalVariavel = doMes.filter((d) => !d.recorrente).reduce((s, d) => s + d.valor, 0);

  return (
    <Tela>
      <div className="flex items-center justify-between gap-2">
        <Botao titulo="‹" secundario rotuloAcessivel="Mês anterior" onClick={() => setDeslocamento(deslocamento - 1)} />
        <p className="text-lg font-bold">{nomeMes(mes)}</p>
        <Botao titulo="›" secundario rotuloAcessivel="Próximo mês" onClick={() => setDeslocamento(deslocamento + 1)} />
      </div>

      <Grade>
        <Cartao icone="financeiro" rotulo="Gastos do mês" valor={reais(total)} detalhe={`${doMes.length} lançamentos`} />
        <Cartao rotulo="Fixos e recorrentes" valor={reais(totalRecorrente)} detalhe="por mês" />
        <Cartao rotulo="Variáveis" valor={reais(totalVariavel)} detalhe="no mês" />
      </Grade>

      <Chips>
        <Chip titulo="Todas" ativo={categoria === null} onClick={() => setCategoria(null)} />
        {OPCOES_CATEGORIA.map((c) => (
          <Chip key={c.valor} titulo={c.rotulo} ativo={categoria === c.valor} onClick={() => setCategoria(c.valor)} />
        ))}
      </Chips>

      <Secao titulo={`Despesas · ${reais(lista.reduce((s, d) => s + d.valor, 0))}`} acao={<Botao titulo="+ Despesa" onClick={() => setFormDespesa({})} />}>
        {lista.length === 0 && <Vazio>Nenhuma despesa neste mês.</Vazio>}
        {lista.map((d) => (
          <Linha
            key={d.id}
            marca={diaMes(d.data)}
            titulo={d.descricao}
            subtitulo={CATEGORIAS[d.categoria]}
            valor={reais(d.valor)}
            etiqueta={d.recorrente && <Etiqueta texto="Recorrente" />}
            onClick={() => setFormDespesa({ item: d })}
            dicaAcao="Editar ou excluir esta despesa"
          />
        ))}
      </Secao>

      <Secao titulo="Gastos recorrentes" acao={<Botao titulo="+ Recorrente" onClick={() => setFormRecorrente({})} />}>
        {recorrentes.length === 0 && <Vazio>Nenhum gasto recorrente cadastrado.</Vazio>}
        {recorrentes.map((r) => (
          <Linha
            key={r.id}
            marca={`dia ${r.dia_vencimento}`}
            titulo={r.descricao}
            subtitulo={CATEGORIAS[r.categoria]}
            valor={reais(r.valor)}
            etiqueta={!r.ativo && <Etiqueta texto="Inativo" />}
            apagada={!r.ativo}
            onClick={() => setFormRecorrente({ item: r })}
            dicaAcao="Editar ou excluir este gasto recorrente"
          />
        ))}
      </Secao>

      {formDespesa && (
        <Formulario
          titulo={formDespesa.item ? 'Editar despesa' : 'Nova despesa'}
          campos={[
            { chave: 'data', rotulo: 'Data', tipo: 'data' },
            { chave: 'categoria', rotulo: 'Categoria', tipo: 'opcoes', opcoes: OPCOES_CATEGORIA },
            { chave: 'descricao', rotulo: 'Descrição', dica: 'Ex.: Diesel — 200 L' },
            { chave: 'valor', rotulo: 'Valor (R$)', tipo: 'numero' },
            {
              chave: 'insumo',
              rotulo: 'Entra no estoque de',
              tipo: 'opcoes',
              opcional: true,
              opcoes: [{ valor: '', rotulo: 'Nenhum' }, ...estoque.map((e) => ({ valor: String(e.id), rotulo: e.nome }))],
              quando: (v) => v.categoria === 'alimentacao',
            },
            {
              chave: 'quantidade',
              rotulo: 'Quantidade comprada',
              tipo: 'numero',
              dica: 'Na unidade do insumo',
              quando: (v) => v.categoria === 'alimentacao' && v.insumo !== '',
            },
          ]}
          iniciais={
            formDespesa.item && {
              data: formDespesa.item.data,
              categoria: formDespesa.item.categoria,
              descricao: formDespesa.item.descricao,
              valor: numParaTexto(formDespesa.item.valor),
              insumo: formDespesa.item.insumo_id ? String(formDespesa.item.insumo_id) : '',
              quantidade: formDespesa.item.quantidade ? numParaTexto(formDespesa.item.quantidade) : '',
            }
          }
          onSalvar={(v) => {
            // Insumo escolhido antes de trocar de categoria fica guardado no formulário; só vale em alimentação.
            const compra = v.categoria === 'alimentacao' && v.insumo !== '';
            return salvar('despesas', {
              ...(formDespesa.item && { id: formDespesa.item.id }),
              data: v.data,
              categoria: v.categoria as Categoria,
              descricao: v.descricao.trim(),
              valor: num(v.valor),
              insumo_id: compra ? Number(v.insumo) : null,
              quantidade: compra ? num(v.quantidade) : null,
            });
          }}
          onExcluir={formDespesa.item && (() => excluir('despesas', formDespesa.item!.id))}
          onFechar={() => setFormDespesa(null)}
        />
      )}

      {formRecorrente && (
        <Formulario
          titulo={formRecorrente.item ? 'Editar gasto recorrente' : 'Novo gasto recorrente'}
          campos={[
            { chave: 'descricao', rotulo: 'Descrição', dica: 'Ex.: Salário — Maria' },
            { chave: 'categoria', rotulo: 'Categoria', tipo: 'opcoes', opcoes: OPCOES_CATEGORIA },
            { chave: 'valor', rotulo: 'Valor mensal (R$)', tipo: 'numero' },
            { chave: 'dia', rotulo: 'Dia do vencimento', tipo: 'numero', dica: '1 a 28' },
            { chave: 'ativo', rotulo: 'Situação', tipo: 'opcoes', opcoes: [{ valor: 'sim', rotulo: 'Ativo' }, { valor: 'nao', rotulo: 'Inativo' }] },
          ]}
          iniciais={
            formRecorrente.item && {
              descricao: formRecorrente.item.descricao,
              categoria: formRecorrente.item.categoria,
              valor: numParaTexto(formRecorrente.item.valor),
              dia: String(formRecorrente.item.dia_vencimento),
              ativo: formRecorrente.item.ativo ? 'sim' : 'nao',
            }
          }
          validar={(v) => {
            const dia = num(v.dia);
            return Number.isInteger(dia) && dia >= 1 && dia <= 28 ? null : 'O dia do vencimento deve ser um número inteiro de 1 a 28.';
          }}
          onSalvar={(v) =>
            salvar('recorrentes', {
              ...(formRecorrente.item && { id: formRecorrente.item.id }),
              descricao: v.descricao.trim(),
              categoria: v.categoria as Categoria,
              valor: num(v.valor),
              dia_vencimento: num(v.dia),
              ativo: v.ativo === 'sim',
            })
          }
          onExcluir={formRecorrente.item && (() => excluir('recorrentes', formRecorrente.item!.id))}
          onFechar={() => setFormRecorrente(null)}
        />
      )}
    </Tela>
  );
}
