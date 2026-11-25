'use client';

import { useEffect, useState } from 'react';

import { type Campo, Formulario, type Valores } from '@/components/formulario';
import { Botao, Cartao, Etiqueta, Grade, Linha, Secao, Tela, Vazio } from '@/components/ui';
import { type Conta, executar, listarContas } from '@/lib/admin';
import { diaMes, numero, useDados } from '@/lib/dados';

const SENHA_MINIMA = 6;
// Senha provisória fica visível de propósito: o desenvolvedor precisa ler para passar à pessoa.
const CAMPO_SENHA: Campo = { chave: 'senha', rotulo: 'Senha provisória', dica: `Mínimo ${SENHA_MINIMA} caracteres` };
const senhaCurta = (v: Valores) => (v.senha.length < SENHA_MINIMA ? `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.` : null);

/** Administração de contas. Só aparece (e só funciona no servidor) para quem é desenvolvedor. */
export default function Desenvolvedor() {
  const { admin } = useDados();
  const [contas, setContas] = useState<Conta[] | null>(null);
  const [eu, setEu] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [selecionada, setSelecionada] = useState<Conta | null>(null);
  const [criando, setCriando] = useState(false);

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

  const pendentes = contas?.filter((c) => !c.aprovado) ?? [];

  const linha = (c: Conta) => (
    <Linha
      key={c.id}
      titulo={c.email + (c.id === eu ? ' (você)' : '')}
      subtitulo={`criada em ${diaMes(c.criada_em)} · ${c.ultimo_acesso ? `último acesso em ${diaMes(c.ultimo_acesso)}` : 'nunca entrou'}`}
      etiqueta={
        <span className="flex flex-col items-end gap-0.5">
          {c.aprovado ? <Etiqueta texto="Aprovada" tom="ok" /> : <Etiqueta texto="Pendente" tom="alerta" />}
          {c.admin && <Etiqueta texto="Desenvolvedor" />}
          {!c.email_confirmado && <Etiqueta texto="E-mail não confirmado" tom="alerta" />}
        </span>
      }
      onClick={() => setSelecionada(c)}
      dicaAcao="Abrir opções desta conta"
    />
  );

  return (
    <Tela>
      <Grade>
        <Cartao rotulo="Contas" valor={contas ? numero(contas.length) : '—'} />
        <Cartao rotulo="Aguardando aprovação" valor={contas ? numero(pendentes.length) : '—'} alerta={pendentes.length > 0} />
        <Cartao rotulo="Desenvolvedores" valor={contas ? numero(contas.filter((c) => c.admin).length) : '—'} />
      </Grade>

      {erro && (
        <div className="flex flex-col items-start gap-2">
          <p role="alert" className="font-medium text-alerta">
            {erro}
          </p>
          <Botao titulo="Tentar de novo" secundario onClick={() => void recarregar()} />
        </div>
      )}
      {!contas && !erro && (
        <p role="status" className="font-medium text-texto-2">
          Carregando contas…
        </p>
      )}

      {pendentes.length > 0 && <Secao titulo="Aguardando aprovação">{pendentes.map(linha)}</Secao>}

      {contas && (
        <Secao titulo={`Todas as contas (${contas.length})`} acao={<Botao titulo="+ Conta" onClick={() => setCriando(true)} />}>
          {contas.length === 0 && <Vazio>Nenhuma conta.</Vazio>}
          {contas.map(linha)}
        </Secao>
      )}
      <p className="text-sm font-medium text-texto-2">
        Clique em uma conta para aprovar ou bloquear o acesso, trocar a senha, confirmar o e-mail, mudar o papel ou excluir.
      </p>

      {criando && (
        <Formulario
          titulo="Nova conta"
          campos={[{ chave: 'email', rotulo: 'E-mail', tipo: 'email', dica: 'pessoa@exemplo.com' }, CAMPO_SENHA]}
          validar={senhaCurta}
          onSalvar={(v) => fazer({ acao: 'criar', email: v.email.trim(), senha: v.senha })}
          onFechar={() => setCriando(false)}
        />
      )}

      {selecionada && (
        <Formulario
          titulo={selecionada.email}
          campos={[
            {
              chave: 'acao',
              rotulo: 'O que fazer',
              tipo: 'opcoes',
              // Só entram as ações que fazem sentido para o estado atual da conta.
              opcoes: [
                ...(selecionada.aprovado ? [] : [{ valor: 'aprovar', rotulo: 'Aprovar acesso' }]),
                { valor: 'senha', rotulo: 'Trocar senha' },
                ...(selecionada.email_confirmado ? [] : [{ valor: 'confirmar_email', rotulo: 'Confirmar e-mail' }]),
                ...(selecionada.id === eu
                  ? []
                  : [
                      ...(selecionada.aprovado ? [{ valor: 'bloquear', rotulo: 'Bloquear acesso' }] : []),
                      selecionada.admin
                        ? { valor: 'tirar_admin', rotulo: 'Tirar papel de desenvolvedor' }
                        : { valor: 'dar_admin', rotulo: 'Tornar desenvolvedor' },
                    ]),
              ],
            },
            { ...CAMPO_SENHA, rotulo: 'Nova senha', quando: (v) => v.acao === 'senha' },
          ]}
          validar={(v) => (v.acao === 'senha' ? senhaCurta(v) : null)}
          onSalvar={(v) => {
            const user_id = selecionada.id;
            if (v.acao === 'senha') return fazer({ acao: 'senha', user_id, senha: v.senha });
            if (v.acao === 'confirmar_email') return fazer({ acao: 'confirmar_email', user_id });
            if (v.acao === 'dar_admin' || v.acao === 'tirar_admin') return fazer({ acao: 'admin', user_id, valor: v.acao === 'dar_admin' });
            return fazer({ acao: 'aprovar', user_id, valor: v.acao === 'aprovar' });
          }}
          // A própria conta não pode ser excluída por aqui (o servidor também recusa).
          onExcluir={selecionada.id !== eu && (() => fazer({ acao: 'excluir', user_id: selecionada.id }))}
          onFechar={() => setSelecionada(null)}
        />
      )}
    </Tela>
  );
}
