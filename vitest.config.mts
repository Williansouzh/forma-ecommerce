import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname) } },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "components/**/*.test.ts"],
    exclude: ["api/**", "node_modules/**", ".next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      // Cobertura só do que decide dinheiro e disponibilidade. Percentual
      // sobre o repositório inteiro mede quanto código foi tocado, não se as
      // regras que importam estão protegidas.
      include: [
        "lib/cart.ts",
        "lib/product-availability.ts",
        "lib/catalog-order.ts",
        "lib/catalog-filters.ts",
      ],
      thresholds: { lines: 90, functions: 100, branches: 85 },
    },
  },
});
