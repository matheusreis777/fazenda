'use client';

import { useState } from 'react';

import { Formulario } from '@/components/formulario';
import { Botao, Cartao, Etiqueta, Grade, Linha, Secao, Tela, Vazio } from '@/components/ui';
import { excluir, type Funcionario, funcionarioEmUso, type Maquina, maquinaEmUso, numero, reais, salvar, useDados } from '@/lib/dados';
import { hojeIso, num, numParaTexto } from '@/lib/formato';

const OPCOES_SITUACAO = [
  { valor: 'sim', rotulo: 'Ativo' },
  { valor: 'nao', rotulo: 'Inativo' },
];

/** Funcionários e máquinas, com o quanto cada um custou (despesas ligadas a ele). */
export default function Equipe() {
  const { funcionarios, maquinas, despesas } = useDados();
  // { item } = editando; {} = novo; null = fechado.
  const [formFunc, setFormFunc] = useState<{ item?: Funcionario } | null>(null);
  const [formMaq, setFormMaq] = useState<{ item?: Maquina } | null>(null);

  const ano = hojeIso().slice(0, 4);
  const doAno = despesas.filter((d) => d.data.startsWith(ano));
  const gastoFunc = (id: number) => doAno.filter((d) => d.funcionario_id === id).reduce((s, d) => s + d.valor, 0);
  const gastoMaq = (id: number) => doAno.filter((d) => d.maquina_id === id).reduce((s, d) => s + d.valor, 0);
  const ativosFunc = funcionarios.filter((f) => f.ativo);
  const folha = ativosFunc.reduce((s, f) => s + (f.salario ?? 0), 0);

  return (
    <Tela>
      <Grade>
        <Cartao rotulo="Funcionários ativos" valor={numero(ativosFunc.length)} />
        <Cartao rotulo="Folha mensal" valor={reais(folha)} detalhe="soma dos salários" />
        <Cartao rotulo="Máquinas ativas" valor={numero(maquinas.filter((m) => m.ativo).length)} />
        <Cartao rotulo={`Gasto com máquinas em ${ano}`} valor={reais(doAno.filter((d) => d.maquina_id).reduce((s, d) => s + d.valor, 0))} />
      </Grade>

      <Secao titulo="Funcionários" acao={<Botao titulo="+ Funcionário" onClick={() => setFormFunc({})} />}>
        {funcionarios.length === 0 && <Vazio>Nenhum funcionário cadastrado.</Vazio>}
        {funcionarios.map((f) => (
          <Linha
            key={f.id}
            titulo={f.nome}
            subtitulo={[f.funcao, f.telefone, `${reais(gastoFunc(f.id))} em ${ano}`].filter(Boolean).join(' · ')}
            valor={f.salario ? reais(f.salario) : undefined}
            etiqueta={!f.ativo && <Etiqueta texto="Inativo" />}
            apagada={!f.ativo}
            onClick={() => setFormFunc({ item: f })}
            dicaAcao="Editar ou excluir este funcionário"
          />
        ))}
      </Secao>

      <Secao titulo="Máquinas" acao={<Botao titulo="+ Máquina" onClick={() => setFormMaq({})} />}>
        {maquinas.length === 0 && <Vazio>Nenhuma máquina cadastrada.</Vazio>}
        {maquinas.map((m) => (
          <Linha
            key={m.id}
            titulo={m.nome}
            subtitulo={[m.tipo, m.identificacao, m.ano && String(m.ano)].filter(Boolean).join(' · ') || undefined}
            valor={reais(gastoMaq(m.id))}
            etiqueta={m.ativo ? <Etiqueta texto={`gasto em ${ano}`} /> : <Etiqueta texto="Inativa" />}
            apagada={!m.ativo}
            onClick={() => setFormMaq({ item: m })}
            dicaAcao="Editar ou excluir esta máquina"
          />
        ))}
      </Secao>
      <p className="text-sm font-medium text-texto-2">
        Para ligar um gasto a um funcionário ou a uma máquina, escolha-o ao lançar a despesa no Financeiro (categorias
        Funcionários e Maquinário).
      </p>

      {formFunc && (
        <Formulario
          titulo={formFunc.item ? 'Editar funcionário' : 'Novo funcionário'}
          campos={[
            { chave: 'nome', rotulo: 'Nome' },
            { chave: 'funcao', rotulo: 'Função', opcional: true, dica: 'Ex.: Vaqueiro, Tratorista' },
            { chave: 'telefone', rotulo: 'Telefone', opcional: true },
            { chave: 'salario', rotulo: 'Salário (R$)', tipo: 'numero', opcional: true },
            { chave: 'admissao', rotulo: 'Admissão', tipo: 'data', opcional: true },
            { chave: 'ativo', rotulo: 'Situação', tipo: 'opcoes', opcoes: OPCOES_SITUACAO },
          ]}
          iniciais={
            formFunc.item && {
              nome: formFunc.item.nome,
              funcao: formFunc.item.funcao ?? '',
              telefone: formFunc.item.telefone ?? '',
              salario: formFunc.item.salario ? numParaTexto(formFunc.item.salario) : '',
              admissao: formFunc.item.admissao ?? '',
              ativo: formFunc.item.ativo ? 'sim' : 'nao',
            }
          }
          onSalvar={(v) =>
            salvar('funcionarios', {
              ...(formFunc.item && { id: formFunc.item.id }),
              nome: v.nome.trim(),
              funcao: v.funcao.trim() || null,
              telefone: v.telefone.trim() || null,
              salario: v.salario.trim() ? num(v.salario) : null,
              admissao: v.admissao || null,
              ativo: v.ativo === 'sim',
            })
          }
          onExcluir={
            formFunc.item &&
            (() => {
              const { id } = formFunc.item!;
              if (funcionarioEmUso(id)) return 'Este funcionário tem despesas ligadas a ele. Para não perder o histórico, marque como inativo.';
              return excluir('funcionarios', id);
            })
          }
          onFechar={() => setFormFunc(null)}
        />
      )}

      {formMaq && (
        <Formulario
          titulo={formMaq.item ? 'Editar máquina' : 'Nova máquina'}
          campos={[
            { chave: 'nome', rotulo: 'Nome', dica: 'Ex.: Trator azul' },
            { chave: 'tipo', rotulo: 'Tipo', opcional: true, dica: 'Ex.: Trator, Implemento, Caminhonete' },
            { chave: 'identificacao', rotulo: 'Modelo / placa / série', opcional: true },
            { chave: 'ano', rotulo: 'Ano', tipo: 'numero', opcional: true },
            { chave: 'ativo', rotulo: 'Situação', tipo: 'opcoes', opcoes: OPCOES_SITUACAO },
          ]}
          iniciais={
            formMaq.item && {
              nome: formMaq.item.nome,
              tipo: formMaq.item.tipo ?? '',
              identificacao: formMaq.item.identificacao ?? '',
              ano: formMaq.item.ano ? String(formMaq.item.ano) : '',
              ativo: formMaq.item.ativo ? 'sim' : 'nao',
            }
          }
          validar={(v) => {
            if (!v.ano.trim()) return null;
            const a = num(v.ano);
            return Number.isInteger(a) && a >= 1900 && a <= 2100 ? null : 'Informe o ano com 4 dígitos.';
          }}
          onSalvar={(v) =>
            salvar('maquinas', {
              ...(formMaq.item && { id: formMaq.item.id }),
              nome: v.nome.trim(),
              tipo: v.tipo.trim() || null,
              identificacao: v.identificacao.trim() || null,
              ano: v.ano.trim() ? num(v.ano) : null,
              ativo: v.ativo === 'sim',
            })
          }
          onExcluir={
            formMaq.item &&
            (() => {
              const { id } = formMaq.item!;
              if (maquinaEmUso(id)) return 'Esta máquina tem despesas ligadas a ela. Para não perder o histórico, marque como inativa.';
              return excluir('maquinas', id);
            })
          }
          onFechar={() => setFormMaq(null)}
        />
      )}
    </Tela>
  );
}
