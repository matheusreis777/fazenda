import type { MetadataRoute } from 'next';

// Manifesto do PWA: é o que deixa instalar o app em computador, celular e tablet.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fazenda — Gestão de gado',
    short_name: 'Fazenda',
    lang: 'pt-BR',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: '#0a0a0a',
    background_color: '#0a0a0a',
    // Gerados de src/app/icon.svg. A versão "maskable" tem o fundo até a borda, para o Android recortar no formato do aparelho.
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
