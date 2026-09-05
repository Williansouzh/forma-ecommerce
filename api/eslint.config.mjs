// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

/**
 * Config ESLint (flat) da API NestJS. Separado do frontend: outro tsconfig,
 * outro runtime e outro conjunto de globais.
 */
export default tseslint.config(
  { ignores: ["dist/**", "coverage/**", "node_modules/**", "eslint.config.mjs"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      sourceType: "module",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Decorator do Nest e payload de webhook chegam como `any` por natureza;
      // o que protege aqui é o DTO com class-validator, não o tipo do handler.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Promise solta num handler engole erro e derruba o request sem log.
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
);
