'use client';

import { useSyncExternalStore } from 'react';

// O tema é a classe `dark` no <html>. Sem escolha salva, segue o sistema; a escolha fica no localStorage.
// O script em src/app/layout.tsx aplica a classe antes da primeira pintura, para a tela não piscar.

/** Mesmo código do script do layout: mantenha os dois iguais. */
export const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem('tema');var e=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',e)}catch(_){}})()`;

const ouvintes = new Set<() => void>();
const assinar = (avisar: () => void) => {
  ouvintes.add(avisar);
  return () => ouvintes.delete(avisar);
};
const escuroAgora = () => document.documentElement.classList.contains('dark');

/** true quando o tema escuro está ativo. */
export function useEscuro(): boolean {
  return useSyncExternalStore(assinar, escuroAgora, () => false);
}

export function alternarTema() {
  const escuro = !escuroAgora();
  document.documentElement.classList.toggle('dark', escuro);
  try {
    localStorage.setItem('tema', escuro ? 'dark' : 'light');
  } catch {
    // Navegador sem localStorage (modo privado antigo): o tema vale só até recarregar.
  }
  ouvintes.forEach((avisar) => avisar());
}
