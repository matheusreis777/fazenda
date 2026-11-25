import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_KEY;

/**
 * Falso enquanto o .env não tiver as chaves do projeto Supabase — o app roda então com dados de exemplo.
 * NEXT_PUBLIC_MODO_EXEMPLO=1 força esse modo mesmo com as chaves, para demonstrar sem tocar nos dados reais.
 */
export const supabaseConfigurado = !!url && !!key && process.env.NEXT_PUBLIC_MODO_EXEMPLO !== '1';

// A sessão fica no localStorage do navegador (padrão do supabase-js), então o login sobrevive a recarregar.
export const supabase = createClient(url || 'https://nao-configurado.supabase.co', key || 'x');
