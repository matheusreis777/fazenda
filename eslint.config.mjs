import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // A função de servidor é Deno, não faz parte do app.
  globalIgnores(['.next/**', '.next-exemplo/**', 'out/**', 'build/**', 'next-env.d.ts', 'supabase/functions/**']),
]);
