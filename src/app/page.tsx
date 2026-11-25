'use client';

import { Barra, Cartao, Etiqueta, Grade, Linha, Secao, Tela } from '@/components/ui';
import { CATEGORIAS, type Categoria, diaMes, mesIso, modoExemplo, nomeLote, numero, proximosManejos, reais, somarDias, useDados } from '@/lib/dados';
import { hojeIso } from '@/lib/formato';

function saudacao() {
  const hora = new Date().getHours();
  return hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
}

export default function Inicio() {
  const { lotes, animais, despesas: todasDespesas, estoque, sanidade } = useDados();
  const hojeData = hojeIso();
  const manejos = proximosManejos(sanidade, somarDias(hojeData, 7));
  const mes = mesIso();
  const despesas = todasDespesas.filter((d) => d.data.startsWith(mes));
  const ativos = animais.filter((a) => !a.saida_data);
  const vendas = animais.filter((a) => a.saida_tipo === 'venda' && a.saida_data?.startsWith(mes));
  const totalVendas = vendas.reduce((s, a) => s + (a.saida_valor ?? 0), 0);
  const totalGasto = despesas.reduce((s, d) => s + d.valor, 0);
  const baixos = estoque.filter((e) => e.saldo < e.minimo);

  const porCategoria = (Object.keys(CATEGORIAS) as Categoria[])
    .map((c) => ({ c, total: despesas.filter((d) => d.categoria === c).reduce((s, d) => s + d.valor, 0) }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total);
  const maior = porCategoria[0]?.total ?? 1;

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Tela>
      <div>
        <p className="text-2xl font-bold">{saudacao()}</p>
        <p className="font-medium text-texto-2">{hoje.charAt(0).toUpperCase() + hoje.slice(1)}</p>
        {modoExemplo() && (
          <p className="text-sm font-medium text-texto-2">Dados de exemplo: o que você lançar some ao recarregar a página.</p>
        )}
      </div>

      <Grade>
        <Cartao icone="rebanho" rotulo="Cabeças ativas" valor={numero(ativos.length)} detalhe={`em ${lotes.length} lotes`} href="/rebanho" />
        <Cartao icone="financeiro" rotulo="Gastos do mês" valor={reais(totalGasto)} detalhe={`${despesas.length} lançamentos`} href="/financeiro" />
        <Cartao icone="vendas" rotulo="Vendas do mês" valor={reais(totalVendas)} detalhe={`${vendas.length} animais`} href="/rebanho" />
        <Cartao
          icone={baixos.length > 0 ? 'alerta' : 'estoque'}
          rotulo="Estoque baixo"
          valor={numero(baixos.length)}
          detalhe={baixos.length > 0 ? 'insumos para repor' : 'tudo em ordem'}
          alerta={baixos.length > 0}
          href="/alimentacao"
        />
      </Grade>

      {manejos.length > 0 && (
        <Secao titulo="Sanidade nesta semana">
          {manejos.map((s) => (
            <Linha
              key={s.id}
              marca={diaMes(s.proxima_data!)}
              titulo={s.produto}
              subtitulo={s.lote_id ? `Lote ${nomeLote(lotes, s.lote_id)}` : `Brinco ${animais.find((a) => a.id === s.animal_id)?.brinco ?? '—'}`}
              etiqueta={s.proxima_data! < hojeData ? <Etiqueta texto="Atrasado" tom="alerta" /> : undefined}
            />
          ))}
        </Secao>
      )}

      {baixos.length > 0 && (
        <Secao titulo="Repor estoque">
          {baixos.map((e) => (
            <Linha
              key={e.id}
              titulo={e.nome}
              subtitulo={`mínimo ${numero(e.minimo)} ${e.unidade}`}
              valor={`${numero(e.saldo)} ${e.unidade}`}
              etiqueta={<Etiqueta texto="Baixo" tom="alerta" />}
              alerta
            />
          ))}
        </Secao>
      )}

      {lotes.length > 0 && (
        <Secao titulo="Rebanho por lote">
          {lotes.map((l) => {
            const n = ativos.filter((a) => a.lote_id === l.id).length;
            return <Barra key={l.id} rotulo={l.nome} valor={`${n} cab.`} fracao={ativos.length ? n / ativos.length : 0} />;
          })}
        </Secao>
      )}

      {porCategoria.length > 0 && (
        <Secao titulo="Gastos do mês por categoria">
          {porCategoria.map(({ c, total }) => (
            <Barra key={c} rotulo={CATEGORIAS[c]} valor={reais(total)} fracao={total / maior} />
          ))}
        </Secao>
      )}
    </Tela>
  );
}
