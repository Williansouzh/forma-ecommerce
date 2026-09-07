import {
  ALL_CATEGORY_SLUGS,
  CATEGORY_SLUGS,
  LEGACY_CATEGORY_MAP,
  LEGACY_CATEGORY_SLUGS,
  canonicalCategory,
  categoryAliases,
} from "./product.schema";

/**
 * A migração de taxonomia depende destes três invariantes. Se algum quebrar, a
 * loja pede uma categoria que a API não resolve, ou um documento antigo deixa
 * de carregar.
 */
describe("taxonomia de categorias", () => {
  it("todo slug aposentado aponta para um canônico existente", () => {
    for (const [legacy, canonical] of Object.entries(LEGACY_CATEGORY_MAP)) {
      expect(CATEGORY_SLUGS).toContain(canonical);
      expect(CATEGORY_SLUGS).not.toContain(legacy);
    }
  });

  // O enum do Mongoose usa esta lista: faltando um slug aposentado, todo
  // documento ainda não migrado passa a falhar na validação ao salvar.
  it("o enum do schema aceita canônicos e aposentados", () => {
    for (const slug of [...CATEGORY_SLUGS, ...LEGACY_CATEGORY_SLUGS]) {
      expect(ALL_CATEGORY_SLUGS).toContain(slug);
    }
  });

  it("resolve o aposentado e deixa o canônico intacto", () => {
    expect(canonicalCategory("geek")).toBe("colecionaveis");
    expect(canonicalCategory("utilidades")).toBe("decoracao");
    expect(canonicalCategory("decoracao")).toBe("decoracao");
    expect(canonicalCategory("desconhecido")).toBe("desconhecido");
  });
});

describe("categoryAliases", () => {
  // É o que a consulta usa em `$in`. Sem o apelido, a coleção "Casa e
  // decoração" deixa de fora as peças ainda gravadas como `utilidades`
  // enquanto o script de migração não roda.
  it("junta o canônico com os aposentados que caem nele", () => {
    expect(categoryAliases("decoracao").sort()).toEqual(
      ["decoracao", "utilidades"].sort(),
    );
    expect(categoryAliases("colecionaveis").sort()).toEqual(
      ["colecionaveis", "geek"].sort(),
    );
  });

  it("aceita ser chamado com o slug antigo e devolve o mesmo conjunto", () => {
    expect(categoryAliases("geek").sort()).toEqual(
      categoryAliases("colecionaveis").sort(),
    );
  });

  it("devolve só ele mesmo para família sem legado", () => {
    expect(categoryAliases("jogos")).toEqual(["jogos"]);
    expect(categoryAliases("presentes")).toEqual(["presentes"]);
  });
});
