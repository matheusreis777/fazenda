'use client';

import { useState } from 'react';

import { Formulario } from '@/components/formulario';
import { Botao, Cartao, CartaoGrupo, contem, Etiqueta, Grade, Grupos, Linha, MenuAcoes, Secao, Tela, Topo, Trilha, usePaginacao, useVista, Vazio } from '@/components/ui';
import { diaMes, excluir, type Funcionario, funcionarioEmUso, type Maquina, maquinaEmUso, numero, numeroCurto, reais, salvar, useDados } from '@/lib/dados';
import { hojeIso, num, numParaTexto } from '@/lib/formato';

/** Funcionários e máquinas, com o quanto cada um custou (despesas ligadas a ele). */
export default function Equipe() {
  const { funcionarios, maquinas, despesas } = useDados();
  // { item } = editando; {} = novo; null = fechado.
  const [formFunc, setFormFunc] = useState<{ item?: Funcionario } | null>(null);
  const [formMaq, setFormMaq] = useState<{ item?: Maquina } | null>(null);

  const [escolhendo, setEscolhendo] = useState(false);
  const [busca, setBusca] = useState('');
  // O que a tela mostra: ?func=ID, ?maq=ID, ?saidos, ?parados ou, sem nada, os cartões.
  const { ver, id, abrir } = useVista(['func', 'maq', 'saidos', 'parados'], () => setBusca(''));
  const voltar = () => abrir();

  const ano = hojeIso().slice(0, 4);
  const soma = (xs: { valor: number }[]) => xs.reduce((s, d) => s + d.valor, 0);
  const doAno = despesas.filter((d) => d.data.startsWith(ano));
  const gastoFunc = (id: number) => soma(doAno.filter((d) => d.funcionario_id === id));
  const gastoMaq = (id: number) => soma(doAno.filter((d) => d.maquina_id === id));
  const ativosFunc = funcionarios.filter((f) => f.ativo);
  const ativasMaq = maquinas.filter((m) => m.ativo);
  const folha = ativosFunc.reduce((s, f) => s + (f.salario ?? 0), 0);

  const termo = busca.trim();
  const achaFunc = (f: Funcionario) => contem(f.nome, termo) || contem(f.funcao, termo);
  const achaMaq = (m: Maquina) => contem(m.nome, termo) || contem(m.tipo, termo) || contem(m.identificacao, termo);
  const pessoa = ver === 'func' ? funcionarios.find((f) => String(f.id) === id) : undefined;
  const maquina = ver === 'maq' ? maquinas.find((m) => String(m.id) === id) : undefined;
  const noInicio = !pessoa && !maquina && ver !== 'saidos' && ver !== 'parados';
  // Gastos lançados no Financeiro com o funcionário ou a máquina aberta; a busca procura na descrição.
  const ligados = despesas.filter((d) => (pessoa && d.funcionario_id === pessoa.id) || (maquina && d.maquina_id === maquina.id));
  const listaGastos = ligados.filter((d) => contem(d.descricao, termo));

  const linhaFunc = (f: Funcionario) => (
    <Linha
      key={`f${f.id}`}
      titulo={f.nome}
      subtitulo={[f.funcao, `${reais(gastoFunc(f.id))} em ${ano}`].filter(Boolean).join(' · ')}
      etiqueta={!f.ativo && <Etiqueta texto="Saiu" />}
      apagada={!f.ativo}
      onClick={() => abrir('func', f.id)}
      dicaAcao="Ver os gastos deste funcionário"
    />
  );
  const linhaMaq = (m: Maquina) => (
    <Linha
      key={`m${m.id}`}
      titulo={m.nome}
      subtitulo={[m.tipo, m.identificacao, `${reais(gastoMaq(m.id))} em ${ano}`].filter(Boolean).join(' · ')}
      etiqueta={!m.ativo && <Etiqueta texto="Fora de uso" />}
      apagada={!m.ativo}
      onClick={() => abrir('maq', m.id)}
      dicaAcao="Ver os gastos desta máquina"
    />
  );
  // Resultado da busca (funcionários e máquinas) ou a lista dos que saíram / estão parados.
  const linhas = noInicio
    ? termo
      ? [...funcionarios.filter(achaFunc).map(linhaFunc), ...maquinas.filter(achaMaq).map(linhaMaq)]
      : []
    : ver === 'saidos'
      ? funcionarios.filter((f) => !f.ativo && achaFunc(f)).map(linhaFunc)
      : ver === 'parados'
        ? maquinas.filter((m) => !m.ativo && achaMaq(m)).map(linhaMaq)
        : [];
  const pagLinhas = usePaginacao(linhas, [termo, ver, id]);
  const pagGastos = usePaginacao(listaGastos, [termo, ver, id]);

  const AVISO_FINANCEIRO = 'Para um gasto contar aqui, lance no Financeiro com a categoria Funcionários ou Maquinário e escolha de quem ou de qual máquina é.';

  return (
    <Tela>
      {/* ---------- Topo fixo: busca e cadastro ---------- */}
      <Topo
        busca={busca}
        onBusca={setBusca}
        dica={pessoa || maquina ? 'Procurar gasto' : 'Procurar nome, função ou máquina'}
        novo="+ Cadastrar"
        rotuloNovo="Cadastrar funcionário ou máquina"
        onNovo={() => setEscolhendo(true)}>
        {numero(ativosFunc.length)} {ativosFunc.length === 1 ? 'funcionário' : 'funcionários'} · salários {reais(folha)} por mês · {numero(ativasMaq.length)}{' '}
        {ativasMaq.length === 1 ? 'máquina' : 'máquinas'} em uso
      </Topo>

      {noInicio && termo ? (
        /* ---------- Resultado da busca ---------- */
        <Secao titulo={`Encontrados com “${termo}” (${linhas.length})`} descricao="Toque para ver os gastos e mudar os dados." rodape={pagLinhas.controles}>
          {linhas.length === 0 && <Vazio>Nenhum funcionário ou máquina com esse nome.</Vazio>}
          {pagLinhas.itens}
        </Secao>
      ) : pessoa || maquina ? (
        /* ---------- Um funcionário ou uma máquina ---------- */
        <>
          <Trilha
            raiz="Equipe e máquinas"
            onVoltar={voltar}
            titulo={(pessoa ?? maquina)!.nome}
            descricao={
              (pessoa ? [pessoa.funcao, pessoa.telefone, !pessoa.ativo && 'já saiu'] : [maquina!.tipo, maquina!.identificacao, maquina!.ano && String(maquina!.ano), !maquina!.ativo && 'fora de uso'])
                .filter(Boolean)
                .join(' · ') || null
            }
            acao={<Botao titulo="Editar" secundario onClick={() => (pessoa ? setFormFunc({ item: pessoa }) : setFormMaq({ item: maquina }))} />}
          />
          <Grade>
            <Cartao rotulo={`Gasto em ${ano}`} valor={reais(pessoa ? gastoFunc(pessoa.id) : gastoMaq(maquina!.id))} />
            <Cartao rotulo="Gasto total" valor={reais(soma(ligados))} detalhe={`${numero(ligados.length)} lançamentos`} />
            {pessoa && <Cartao rotulo="Salário" valor={pessoa.salario ? reais(pessoa.salario) : '—'} detalhe="por mês" />}
          </Grade>
          <Secao titulo={`Gastos (${listaGastos.length})`} descricao={`${AVISO_FINANCEIRO} Para corrigir um gasto, vá ao Financeiro.`} rodape={pagGastos.controles}>
            {listaGastos.length === 0 && <Vazio>{ligados.length === 0 ? 'Nenhum gasto ligado ainda.' : 'Nenhum gasto com esse nome.'}</Vazio>}
            {pagGastos.itens.map((d) => (
              <Linha key={d.id} marca={`${diaMes(d.data)}/${d.data.slice(2, 4)}`} titulo={d.descricao} valor={reais(d.valor)} etiqueta={d.recorrente && <Etiqueta texto="Fixo" />} />
            ))}
          </Secao>
        </>
      ) : ver === 'saidos' || ver === 'parados' ? (
        /* ---------- Quem saiu / máquinas paradas ---------- */
        <>
          <Trilha raiz="Equipe e máquinas" onVoltar={voltar} aqui={ver === 'saidos' ? 'Funcionários que saíram' : 'Máquinas fora de uso'} />
          <Secao
            titulo={ver === 'saidos' ? `Funcionários que saíram (${linhas.length})` : `Máquinas fora de uso (${linhas.length})`}
            descricao="O histórico de gastos fica guardado. Toque para ver ou mudar os dados."
            rodape={pagLinhas.controles}>
            {linhas.length === 0 && <Vazio>{ver === 'saidos' ? 'Nenhum funcionário saiu.' : 'Nenhuma máquina fora de uso.'}</Vazio>}
            {pagLinhas.itens}
          </Secao>
        </>
      ) : (
        /* ---------- Início: um cartão por funcionário e por máquina ---------- */
        <>
          <Grupos titulo="Funcionários" vazio={ativosFunc.length === 0 && 'Nenhum funcionário trabalhando.'} novo="+ Novo funcionário" onNovo={() => setFormFunc({})}>
            {ativosFunc.map((f) => (
              <CartaoGrupo
                key={f.id}
                titulo={f.nome}
                valor={numeroCurto(gastoFunc(f.id))}
                unidade={`reais em ${ano}`}
                detalhes={[f.funcao, !!f.salario && `salário ${reais(f.salario)}`]}
                onClick={() => abrir('func', f.id)}
              />
            ))}
          </Grupos>

          <Grupos titulo="Máquinas e veículos" vazio={ativasMaq.length === 0 && 'Nenhuma máquina em uso.'} novo="+ Nova máquina" onNovo={() => setFormMaq({})}>
            {ativasMaq.map((m) => (
              <CartaoGrupo
                key={m.id}
                titulo={m.nome}
                valor={numeroCurto(gastoMaq(m.id))}
                unidade={`reais em ${ano}`}
                detalhes={[[m.tipo, m.identificacao].filter(Boolean).join(' · ')]}
                onClick={() => abrir('maq', m.id)}
              />
            ))}
          </Grupos>

          <Secao titulo="Mais">
            <Linha
              titulo="Funcionários que saíram"
              subtitulo="O histórico fica guardado"
              valor={numero(funcionarios.length - ativosFunc.length)}
              onClick={() => abrir('saidos')}
              dicaAcao="Ver os funcionários que saíram"
            />
            <Linha
              titulo="Máquinas fora de uso"
              subtitulo="Vendidas ou paradas"
              valor={numero(maquinas.length - ativasMaq.length)}
              onClick={() => abrir('parados')}
              dicaAcao="Ver as máquinas fora de uso"
            />
          </Secao>
          <p className="text-sm font-medium text-texto-2">{AVISO_FINANCEIRO}</p>
        </>
      )}

      {escolhendo && (
        <MenuAcoes
          titulo="O que vai cadastrar?"
          onFechar={() => setEscolhendo(false)}
          acoes={[
            { titulo: 'Funcionário', descricao: 'Uma pessoa que trabalha na fazenda.', onClick: () => (setEscolhendo(false), setFormFunc({})) },
            { titulo: 'Máquina ou veículo', descricao: 'Trator, caminhonete, roçadeira…', onClick: () => (setEscolhendo(false), setFormMaq({})) },
          ]}
        />
      )}

      {formFunc && (
        <Formulario
          titulo={formFunc.item ? formFunc.item.nome : 'Novo funcionário'}
          campos={[
            { chave: 'nome', rotulo: 'Nome completo' },
            { chave: 'funcao', rotulo: 'O que faz', opcional: true, dica: 'Ex.: Vaqueiro, Tratorista' },
            { chave: 'telefone', rotulo: 'Telefone', opcional: true, dica: 'Ex.: (64) 99999-0000' },
            {
              chave: 'salario',
              rotulo: 'Salário (R$)',
              tipo: 'numero',
              opcional: true,
              ajuda: 'Só para consulta. Para o salário entrar nos gastos todo mês, cadastre um gasto fixo no Financeiro.',
            },
            { chave: 'admissao', rotulo: 'Data em que começou', tipo: 'data', opcional: true },
            {
              chave: 'ativo',
              rotulo: 'Trabalha aqui hoje?',
              tipo: 'opcoes',
              opcoes: [
                { valor: 'sim', rotulo: 'Sim' },
                { valor: 'nao', rotulo: 'Não, já saiu' },
              ],
            },
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
              if (funcionarioEmUso(id)) return 'Não dá para excluir: há gastos ligados a este funcionário. Se ele saiu, marque “Não, já saiu” e salve.';
              voltar();
              return excluir('funcionarios', id);
            })
          }
          salvarTexto={formFunc.item ? 'Salvar alterações' : 'Cadastrar funcionário'}
          sucesso={formFunc.item ? 'Funcionário atualizado.' : 'Funcionário cadastrado.'}
          excluirTexto="Excluir funcionário"
          onFechar={() => setFormFunc(null)}
        />
      )}

      {formMaq && (
        <Formulario
          titulo={formMaq.item ? formMaq.item.nome : 'Nova máquina'}
          campos={[
            { chave: 'nome', rotulo: 'Nome', dica: 'Ex.: Trator azul', ajuda: 'Como vocês chamam a máquina no dia a dia.' },
            { chave: 'tipo', rotulo: 'Tipo', opcional: true, dica: 'Ex.: Trator, Caminhonete, Roçadeira' },
            { chave: 'identificacao', rotulo: 'Modelo ou placa', opcional: true, dica: 'Ex.: Massey Ferguson 4275' },
            { chave: 'ano', rotulo: 'Ano', tipo: 'numero', opcional: true, dica: 'Ex.: 2015' },
            {
              chave: 'ativo',
              rotulo: 'Está em uso?',
              tipo: 'opcoes',
              opcoes: [
                { valor: 'sim', rotulo: 'Sim' },
                { valor: 'nao', rotulo: 'Não, foi vendida ou parou' },
              ],
            },
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
              if (maquinaEmUso(id)) return 'Não dá para excluir: há gastos ligados a esta máquina. Se parou de usar, marque “Não” em “Está em uso?” e salve.';
              voltar();
              return excluir('maquinas', id);
            })
          }
          salvarTexto={formMaq.item ? 'Salvar alterações' : 'Cadastrar máquina'}
          sucesso={formMaq.item ? 'Máquina atualizada.' : 'Máquina cadastrada.'}
          excluirTexto="Excluir máquina"
          onFechar={() => setFormMaq(null)}
        />
      )}
    </Tela>
  );
}
