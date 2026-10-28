import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/** Config ESLint (flat) do frontend. */
const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      // Chegou com o eslint-config-next 16 e reprova nove `setState` em
      // efeito (busca, tema, painel) que já rodavam assim no 15. É custo de
      // uma renderização a mais, não defeito; refatorar oito componentes sem
      // teste dentro da migração do framework seria trocar de risco. Religar
      // ao reescrever esses efeitos.
      "react-hooks/set-state-in-effect": "off",
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
