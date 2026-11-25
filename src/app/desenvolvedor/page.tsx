'use client';

import { useEffect, useState } from 'react';

import { type Campo, Formulario, type Valores } from '@/components/formulario';
import { type Acao, Botao, CartaoGrupo, Confirmacao, contem, Etiqueta, Girando, Grupos, Linha, MenuAcoes, Secao, Tela, Topo, usePaginacao, Vazio, Voltar } from '@/components/ui';
import { type Conta, executar, listarContas } from '@/lib/admin';
import { diaMes, numero, useDados } from '@/lib/dados';

/** O que a tela mostra: os cartões ou uma das listas de contas. */
type Vista = 'inicio' | 'pendentes' | 'aprovadas' | 'dev' | 'todas';
const TITULOS = { pendentes: 'Esperando aprovação', aprovadas: 'Podem entrar', dev: 'Desenvolvedores', todas: 'Todas as contas' };

const SENHA_MINIMA = 6;
// Senha provisória fica visível de propósito: o desenvolvedor precisa ler para passar à pessoa.
const CAMPO_SENHA: Campo = {
  chave: 'senha',
  rotulo: 'Senha provisória',
  dica: 'Ex.: fazenda2026',
  ajuda: `Pelo menos ${SENHA_MINIMA} letras ou números. Passe para a pessoa e peça para ela trocar depois (botão “Trocar senha” no topo).`,
};
const senhaCurta = (v: Valores) => (v.senha.length < SENHA_MINIMA ? `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.` : null);

/** Administração de contas. Só aparece (e só funciona no servidor) para quem é desenvolvedor. */
export default function Desenvolvedor() {
  const { admin } = useDados();
  const [contas, setContas] = useState<Conta[] | null>(null);
  const [eu, setEu] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [selecionada, setSelecionada] = useState<Conta | null>(null);
  /** Ação escolhida no menu da conta: abre a confirmação ou o formulário dela. */
  const [acao, setAcao] = useState<'aprovar' | 'bloquear' | 'senha' | 'confirmar_email' | 'dar_admin' | 'tirar_admin' | 'excluir' | null>(null);
  const fecharTudo = () => {
    setAcao(null);
    setSelecionada(null);
  };
  const [criando, setCriando] = useState(false);
  // Antes do retorno antecipado abaixo: hooks não podem depender de condição.
  const [busca, setBusca] = useState('');
  const [vista, setVista] = useState<Vista>('inicio');
  const abrir = (v: Vista) => {
    setVista(v);
    setBusca('');
  };
  const termo = busca.trim();
  const todas = contas ?? [];
  const grupos: Record<Vista, Conta[]> = {
    inicio: todas,
    todas,
    pendentes: todas.filter((c) => !c.aprovado),
    aprovadas: todas.filter((c) => c.aprovado),
    dev: todas.filter((c) => c.admin),
  };
  // Na tela inicial a busca vale para todas as contas; dentro de uma lista, filtra só aquela lista.
  const lista = vista === 'inicio' && !termo ? [] : grupos[vista].filter((c) => contem(c.email, termo));
  const pag = usePaginacao(lista, [vista, termo]);

  function aplicar({ dados, erro }: Awaited<ReturnType<typeof listarContas>>) {
    setErro(erro ?? null);
    if (dados) {
      setContas(dados.contas);
      setEu(dados.eu);
    }
  }
  const recarregar = async () => aplicar(await listarContas());

  // Primeira carga da lista, quando a tela abre para um desenvolvedor.
  useEffect(() => {
    if (!admin) return;
    let ativa = true;
    void listarContas().then((resposta) => {
      if (ativa) aplicar(resposta);
    });
    return () => {
      ativa = false;
    };
  }, [admin]);

  /** Roda a ação e, se deu certo, atualiza a lista antes de fechar o formulário. */
  async function fazer(pedido: Parameters<typeof executar>[0]) {
    const falha = await executar(pedido);
    if (!falha) await recarregar();
    return falha;
  }

  if (!admin) {
    return (
      <Tela>
        <p className="font-medium text-texto-2">Esta área é só para desenvolvedores.</p>
      </Tela>
    );
  }

  const pendentes = grupos.pendentes;

  const linha = (c: Conta) => (
    <Linha
      key={c.id}
      titulo={c.email + (c.id === eu ? ' (você)' : '')}
      subtitulo={`criada em ${diaMes(c.criada_em)} · ${c.ultimo_acesso ? `último acesso em ${diaMes(c.ultimo_acesso)}` : 'nunca entrou'}`}
      etiqueta={
        <span className="flex flex-col items-end gap-0.5">
          {c.aprovado ? <Etiqueta texto="Pode entrar" tom="ok" /> : <Etiqueta texto="Esperando aprovação" tom="alerta" />}
          {c.admin && <Etiqueta texto="Desenvolvedor" />}
          {!c.email_confirmado && <Etiqueta texto="E-mail não confirmado" tom="alerta" />}
        </span>
      }
      onClick={() => setSelecionada(c)}
      dicaAcao="Ver o que dá para fazer com esta conta"
    />
  );

  return (
    <Tela>
      {/* ---------- Topo fixo: busca por e-mail e criação de conta ---------- */}
      <Topo busca={busca} onBusca={setBusca} dica="Procurar e-mail" novo="+ Conta" rotuloNovo="Criar conta" onNovo={() => setCriando(true)}>
        {contas && `${numero(contas.length)} contas · ${numero(pendentes.length)} esperando aprovação`}
      </Topo>

      {erro && (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="font-medium text-alerta">
            {erro}
          </p>
          <Botao titulo="Tentar de novo" secundario onClick={recarregar} />
        </div>
      )}
      {!contas && !erro && (
        <p role="status" className="flex items-center gap-2 font-medium text-texto-2">
          <Girando />
          Carregando contas…
        </p>
      )}

      {contas &&
        (vista === 'inicio' && !termo ? (
          /* ---------- Início: um cartão por situação ---------- */
          <>
            <Grupos titulo="Contas">
              <CartaoGrupo
                titulo="Esperando aprovação"
                valor={numero(pendentes.length)}
                unidade={pendentes.length === 1 ? 'conta' : 'contas'}
                alerta={pendentes.length > 0}
                detalhes={[pendentes.length > 0 ? 'toque para aprovar' : 'ninguém esperando']}
                onClick={() => abrir('pendentes')}
              />
              <CartaoGrupo titulo="Podem entrar" valor={numero(grupos.aprovadas.length)} unidade="contas" detalhes={['veem e lançam os dados']} onClick={() => abrir('aprovadas')} />
              <CartaoGrupo titulo="Desenvolvedores" valor={numero(grupos.dev.length)} unidade="contas" detalhes={['cuidam das contas']} onClick={() => abrir('dev')} />
            </Grupos>
            <Secao titulo="Mais">
              <Linha titulo="Todas as contas" subtitulo="Aprovar, bloquear, trocar a senha ou excluir" valor={numero(contas.length)} onClick={() => abrir('todas')} dicaAcao="Ver todas as contas" />
            </Secao>
          </>
        ) : (
          /* ---------- Uma lista de contas (ou o resultado da busca) ---------- */
          <>
            {vista !== 'inicio' && <Voltar para="Voltar" onVoltar={() => abrir('inicio')} />}
            <Secao
              titulo={`${vista === 'inicio' ? `Contas com “${termo}”` : TITULOS[vista]} (${lista.length})`}
              descricao="Toque em uma conta para aprovar, bloquear, trocar a senha ou excluir."
              rodape={pag.controles}>
              {lista.length === 0 && <Vazio>{termo ? 'Nenhuma conta com esse e-mail.' : 'Nenhuma conta aqui.'}</Vazio>}
              {pag.itens.map(linha)}
            </Secao>
          </>
        ))}

      {criando && (
        <Formulario
          titulo="Criar conta"
          descricao="A conta já nasce aprovada: a pessoa entra com este e-mail e a senha provisória."
          campos={[{ chave: 'email', rotulo: 'E-mail da pessoa', tipo: 'email', dica: 'pessoa@exemplo.com' }, CAMPO_SENHA]}
          validar={senhaCurta}
          onSalvar={(v) => fazer({ acao: 'criar', email: v.email.trim(), senha: v.senha })}
          salvarTexto="Criar conta"
          sucesso="Conta criada."
          onFechar={() => setCriando(false)}
        />
      )}

      {selecionada && !acao && (
        <MenuAcoes
          titulo={selecionada.email}
          descricao={selecionada.aprovado ? 'Esta conta pode entrar e ver os dados da fazenda.' : 'Esta conta ainda não pode ver os dados.'}
          onFechar={fecharTudo}
          acoes={[
            ...(selecionada.aprovado
              ? []
              : [{ titulo: 'Aprovar acesso', descricao: 'A pessoa passa a ver e lançar os dados da fazenda.', onClick: () => setAcao('aprovar') }]),
            { titulo: 'Trocar a senha', descricao: 'Definir uma senha provisória para a pessoa entrar.', onClick: () => setAcao('senha') },
            ...(selecionada.email_confirmado
              ? []
              : [{ titulo: 'Confirmar o e-mail', descricao: 'Para quem não recebeu ou não achou o e-mail de confirmação.', onClick: () => setAcao('confirmar_email') }]),
            // A própria conta não pode ser bloqueada, rebaixada nem excluída (o servidor também recusa).
            ...(selecionada.id === eu
              ? []
              : ([
                  selecionada.admin
                    ? { titulo: 'Tirar o acesso de desenvolvedor', descricao: 'A pessoa deixa de ver esta tela de contas.', onClick: () => setAcao('tirar_admin') }
                    : { titulo: 'Tornar desenvolvedor', descricao: 'A pessoa passa a ver esta tela e a cuidar das contas.', onClick: () => setAcao('dar_admin') },
                  ...(selecionada.aprovado
                    ? [{ titulo: 'Bloquear acesso', descricao: 'A pessoa continua com a conta, mas deixa de ver os dados.', perigo: true, onClick: () => setAcao('bloquear') }]
                    : []),
                  { titulo: 'Excluir conta', descricao: 'Apaga a conta de vez. A pessoa não consegue mais entrar.', perigo: true, onClick: () => setAcao('excluir') },
                ] as Acao[])),
          ]}
        />
      )}

      {selecionada && acao === 'senha' && (
        <Formulario
          titulo={`Trocar a senha de ${selecionada.email}`}
          campos={[{ ...CAMPO_SENHA, rotulo: 'Nova senha provisória' }]}
          validar={senhaCurta}
          onSalvar={(v) => fazer({ acao: 'senha', user_id: selecionada.id, senha: v.senha })}
          salvarTexto="Trocar senha"
          sucesso="Senha trocada."
          onFechar={fecharTudo}
        />
      )}

      {selecionada && acao && acao !== 'senha' && (
        <Confirmacao
          {...{
            aprovar: { titulo: 'Aprovar acesso?', texto: `${selecionada.email} vai poder ver e lançar os dados da fazenda.`, confirmar: 'Sim, aprovar', perigo: false, sucesso: 'Acesso aprovado.' },
            bloquear: { titulo: 'Bloquear acesso?', texto: `${selecionada.email} deixa de ver os dados. Dá para aprovar de novo depois.`, confirmar: 'Sim, bloquear', perigo: true, sucesso: 'Acesso bloqueado.' },
            confirmar_email: { titulo: 'Confirmar o e-mail?', texto: `Marca o e-mail ${selecionada.email} como confirmado, sem precisar do link.`, confirmar: 'Sim, confirmar', perigo: false, sucesso: 'E-mail confirmado.' },
            dar_admin: { titulo: 'Tornar desenvolvedor?', texto: `${selecionada.email} vai poder aprovar, bloquear e excluir contas, como você.`, confirmar: 'Sim, tornar desenvolvedor', perigo: false, sucesso: 'Agora é desenvolvedor.' },
            tirar_admin: { titulo: 'Tirar o acesso de desenvolvedor?', texto: `${selecionada.email} continua usando o app, mas sem esta tela de contas.`, confirmar: 'Sim, tirar', perigo: true, sucesso: 'Acesso de desenvolvedor retirado.' },
            excluir: { titulo: 'Excluir esta conta?', texto: `A conta ${selecionada.email} será apagada de vez. Os dados da fazenda não são afetados.`, confirmar: 'Excluir conta', perigo: true, sucesso: 'Conta excluída.' },
          }[acao]}
          onConfirmar={() => {
            const user_id = selecionada.id;
            if (acao === 'excluir') return fazer({ acao: 'excluir', user_id });
            if (acao === 'confirmar_email') return fazer({ acao: 'confirmar_email', user_id });
            if (acao === 'dar_admin' || acao === 'tirar_admin') return fazer({ acao: 'admin', user_id, valor: acao === 'dar_admin' });
            return fazer({ acao: 'aprovar', user_id, valor: acao === 'aprovar' });
          }}
          onFechar={fecharTudo}
        />
      )}
    </Tela>
  );
}
