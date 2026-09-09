import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

/**
 * Config ESLint (flat) do frontend.
 *
 * O `eslint-config-next` 15 ainda só exporta o formato legado, então passa
 * pelo `FlatCompat`. Quando o projeto subir para o 16, dá para trocar por
 * `...next` direto e apagar a dependência `@eslint/eslintrc`.
 */
const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Variável de descarte é intencional em destructuring de props e em
      // catch sem uso — o padrão `_` sinaliza isso melhor que um comentário.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    ignores: [
      ".next/**",
      // Saída do adaptador da Cloudflare: código gerado, com o estilo de quem
      // o gerou. Sem isto o lint reprova o build por `require()` e variáveis
      // de catch não usadas em arquivo que ninguém escreveu.
      ".open-next/**",
      ".wrangler/**",
      "coverage/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      // A API tem tsconfig, regras e ciclo de vida próprios; roda seu lint.
      "api/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
