'use client';

import { useState } from 'react';

import { Formulario } from '@/components/formulario';
import { Barra, Botao, Cartao, Etiqueta, Grade, Linha, Secao, Tela, Vazio } from '@/components/ui';
import { diaMes, excluir, type Insumo, insumoEmUso, nomeLote, numero, salvar, type Trato, useDados } from '@/lib/dados';
import { num, numParaTexto } from '@/lib/formato';

export default function Alimentacao() {
  const { lotes, estoque, tratos } = useDados();
  // { item } = editando aquele registro; {} = novo; null = fechado.
  const [formInsumo, setFormInsumo] = useState<{ item?: Insumo } | null>(null);
  const [formTrato, setFormTrato] = useState<{ item?: Trato } | null>(null);

  const baixos = estoque.filter((e) => e.saldo < e.minimo);
  const ultimoDia = tratos[0]?.data;
  const tratosDoDia = tratos.filter((t) => t.data === ultimoDia);

  const consumo = Object.entries(
    tratos.reduce<Record<string, number>>((acc, t) => ({ ...acc, [t.insumo]: (acc[t.insumo] ?? 0) + t.quantidade }), {}),
  );
  const maiorConsumo = Math.max(...consumo.map(([, v]) => v));

  return (
    <Tela>
      <Grade>
        <Cartao icone="estoque" rotulo="Insumos" valor={numero(estoque.length)} detalhe="cadastrados" />
        <Cartao
          icone={baixos.length > 0 ? 'alerta' : 'estoque'}
          rotulo="Estoque baixo"
          valor={numero(baixos.length)}
          detalhe={baixos.length > 0 ? 'para repor' : 'tudo em ordem'}
          alerta={baixos.length > 0}
        />
        <Cartao icone="alimentacao" rotulo="Últimos tratos" valor={numero(tratosDoDia.length)} detalhe={ultimoDia ? `em ${diaMes(ultimoDia)}` : 'nenhum lançado'} />
      </Grade>

      <Secao titulo="Estoque de insumos" acao={<Botao titulo="+ Insumo" onClick={() => setFormInsumo({})} />}>
        {estoque.length === 0 && <Vazio>Nenhum insumo cadastrado.</Vazio>}
        {estoque.map((e) => {
          const baixo = e.saldo < e.minimo;
          return (
            <Linha
              key={e.id}
              titulo={e.nome}
              subtitulo={`mínimo ${numero(e.minimo)} ${e.unidade}`}
              valor={`${numero(e.saldo)} ${e.unidade}`}
              etiqueta={baixo ? <Etiqueta texto="Baixo" tom="alerta" /> : <Etiqueta texto="Ok" tom="ok" />}
              alerta={baixo}
              onClick={() => setFormInsumo({ item: e })}
              dicaAcao="Editar ou excluir este insumo"
            />
          );
        })}
      </Secao>

      <Secao titulo="Últimos tratos" acao={<Botao titulo="+ Lançar trato" onClick={() => setFormTrato({})} />}>
        {tratos.length === 0 && <Vazio>Nenhum trato lançado.</Vazio>}
        {tratos.map((t) => (
          <Linha
            key={t.id}
            marca={diaMes(t.data)}
            titulo={t.insumo}
            subtitulo={nomeLote(lotes, t.lote_id)}
            valor={`${numero(t.quantidade)} ${t.unidade}`}
            onClick={() => setFormTrato({ item: t })}
            dicaAcao="Editar ou excluir este trato"
          />
        ))}
      </Secao>

      {consumo.length > 0 && (
        <Secao titulo="Consumo recente por insumo">
          {consumo.map(([insumo, total]) => (
            <Barra key={insumo} rotulo={insumo} valor={numero(total)} fracao={total / maiorConsumo} />
          ))}
        </Secao>
      )}

      {formInsumo && (
        <Formulario
          titulo={formInsumo.item ? 'Editar insumo' : 'Novo insumo'}
          campos={[
            { chave: 'nome', rotulo: 'Nome', dica: 'Ex.: Farelo de soja' },
            { chave: 'unidade', rotulo: 'Unidade', tipo: 'opcoes', opcoes: ['kg', 'L', 'doses', 'un'].map((u) => ({ valor: u, rotulo: u })) },
            { chave: 'minimo', rotulo: 'Estoque mínimo', tipo: 'numero' },
            {
              chave: 'inicial',
              // Na edição o saldo atual já inclui compras e tratos; este campo é só o ponto de partida.
              rotulo: formInsumo.item ? 'Saldo inicial (antes das compras e tratos)' : 'Quanto já tem em estoque',
              tipo: 'numero',
              opcional: true,
            },
          ]}
          iniciais={
            formInsumo.item && {
              nome: formInsumo.item.nome,
              unidade: formInsumo.item.unidade,
              minimo: numParaTexto(formInsumo.item.minimo),
              inicial: formInsumo.item.saldo_inicial ? numParaTexto(formInsumo.item.saldo_inicial) : '',
            }
          }
          validar={(v) =>
            estoque.some((e) => e.nome.toLowerCase() === v.nome.trim().toLowerCase() && e.id !== formInsumo.item?.id)
              ? 'Já existe um insumo com esse nome.'
              : null
          }
          onSalvar={(v) =>
            salvar('insumos', {
              ...(formInsumo.item && { id: formInsumo.item.id }),
              nome: v.nome.trim(),
              unidade: v.unidade,
              minimo: num(v.minimo),
              saldo_inicial: v.inicial.trim() ? num(v.inicial) : 0,
            })
          }
          onExcluir={
            formInsumo.item &&
            (() => {
              const { id } = formInsumo.item!;
              if (insumoEmUso(id)) return 'Este insumo tem tratos ou compras lançados. Exclua esses lançamentos antes.';
              return excluir('insumos', id);
            })
          }
          onFechar={() => setFormInsumo(null)}
        />
      )}

      {formTrato && (
        <Formulario
          titulo={formTrato.item ? 'Editar trato' : 'Lançar trato'}
          campos={[
            { chave: 'data', rotulo: 'Data', tipo: 'data' },
            { chave: 'lote', rotulo: 'Lote', tipo: 'opcoes', opcoes: lotes.map((l) => ({ valor: String(l.id), rotulo: l.nome })) },
            { chave: 'insumo', rotulo: 'Insumo', tipo: 'opcoes', opcoes: estoque.map((e) => ({ valor: String(e.id), rotulo: e.nome })) },
            { chave: 'quantidade', rotulo: 'Quantidade', tipo: 'numero' },
          ]}
          iniciais={
            formTrato.item && {
              data: formTrato.item.data,
              lote: String(formTrato.item.lote_id),
              insumo: String(formTrato.item.insumo_id),
              quantidade: numParaTexto(formTrato.item.quantidade),
            }
          }
          validar={(v) => {
            const insumo = estoque.find((e) => e.id === Number(v.insumo));
            if (!insumo) return 'Cadastre um insumo antes de lançar o trato.';
            if (!v.lote) return 'Cadastre um lote antes de lançar o trato.';
            // Na edição, o que este trato já tinha consumido do mesmo insumo volta a contar como disponível.
            const disponivel = insumo.saldo + (formTrato.item?.insumo_id === insumo.id ? formTrato.item.quantidade : 0);
            return num(v.quantidade) > disponivel ? `Estoque insuficiente: há ${numero(disponivel)} ${insumo.unidade} de ${insumo.nome}.` : null;
          }}
          onSalvar={(v) =>
            salvar('tratos', {
              ...(formTrato.item && { id: formTrato.item.id }),
              data: v.data,
              lote_id: Number(v.lote),
              insumo_id: Number(v.insumo),
              quantidade: num(v.quantidade),
            })
          }
          onExcluir={formTrato.item && (() => excluir('tratos', formTrato.item!.id))}
          onFechar={() => setFormTrato(null)}
        />
      )}
    </Tela>
  );
}
