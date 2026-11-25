'use client';

import { useSyncExternalStore } from 'react';

// O tema é a classe `dark` no <html>. Sem escolha salva, segue o sistema; a escolha fica no localStorage.
// A cor de destaque é o atributo data-cor no <html> (as cores estão em src/app/globals.css), também no localStorage.
// O script em src/app/layout.tsx aplica os dois antes da primeira pintura, para a tela não piscar.

/** Mesmo código do script do layout: mantenha os dois iguais. */
export const SCRIPT_TEMA = `(function(){try{var h=document.documentElement,t=localStorage.getItem('tema'),c=localStorage.getItem('cor');h.classList.toggle('dark',t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches);if(c)h.dataset.cor=c}catch(_){}})()`;

/** Cores de destaque disponíveis. Os valores de cada uma ficam em src/app/globals.css ([data-cor='…']). */
export const CORES = { padrao: 'Padrão', verde: 'Verde', azul: 'Azul', terra: 'Terra', roxo: 'Roxo' } as const;
export type Cor = keyof typeof CORES;

const ouvintes = new Set<() => void>();
const assinar = (avisar: () => void) => {
  ouvintes.add(avisar);
  return () => ouvintes.delete(avisar);
};
const escuroAgora = () => document.documentElement.classList.contains('dark');

/** 'sistema' = nada salvo: segue o tema do celular ou computador. */
export type Tema = 'light' | 'dark' | 'sistema';
const temaSalvo = (): Tema => {
  try {
    const t = localStorage.getItem('tema');
    return t === 'light' || t === 'dark' ? t : 'sistema';
  } catch {
    return 'sistema';
  }
};

/** true quando o tema escuro está ativo. */
export function useEscuro(): boolean {
  return useSyncExternalStore(assinar, escuroAgora, () => false);
}

/** A escolha da pessoa (claro, escuro ou seguir o sistema). */
export function useTema(): Tema {
  return useSyncExternalStore(assinar, temaSalvo, () => 'sistema');
}

export function escolherTema(tema: Tema) {
  try {
    if (tema === 'sistema') localStorage.removeItem('tema');
    else localStorage.setItem('tema', tema);
  } catch {
    // Navegador sem localStorage (modo privado antigo): o tema vale só até recarregar.
  }
  document.documentElement.classList.toggle('dark', tema === 'sistema' ? matchMedia('(prefers-color-scheme: dark)').matches : tema === 'dark');
  ouvintes.forEach((avisar) => avisar());
}

export const alternarTema = () => escolherTema(escuroAgora() ? 'light' : 'dark');

// A cor em uso é lida do próprio <html>, que o script do layout já preencheu.
const corAtual = () => (document.documentElement.dataset.cor as Cor | undefined) ?? 'padrao';

export function useCor(): Cor {
  return useSyncExternalStore(assinar, corAtual, () => 'padrao');
}

export function escolherCor(cor: Cor) {
  try {
    localStorage.setItem('cor', cor);
  } catch {
    // Sem localStorage: a cor vale só até recarregar.
  }
  document.documentElement.dataset.cor = cor;
  ouvintes.forEach((avisar) => avisar());
}

// No automático, acompanha quando o sistema troca de tema com o app aberto (ex.: modo noturno do celular).
// Na impressão (certidão, relatórios) o papel é branco: tira o tema escuro enquanto imprime, senão o texto sai claro
// numa folha branca, e devolve depois.
if (typeof window !== 'undefined') {
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => temaSalvo() === 'sistema' && escolherTema('sistema'));
  let escuroAntes = false;
  window.addEventListener('beforeprint', () => {
    escuroAntes = escuroAgora();
    document.documentElement.classList.remove('dark');
  });
  window.addEventListener('afterprint', () => escuroAntes && document.documentElement.classList.add('dark'));
}
