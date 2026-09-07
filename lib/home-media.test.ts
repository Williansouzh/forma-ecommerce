import { describe, expect, it } from "vitest";
import {
  DEFAULT_ATELIER_POSTERS,
  DEFAULT_HERO,
  DEFAULT_LOOKBOOK,
  resolveHomeMedia,
} from "./home-media";

describe("resolveHomeMedia", () => {
  /**
   * A garantia que permitiu ligar isto sem migração: sem nada configurado, a
   * vitrine mostra exatamente o que mostrava antes de o recurso existir.
   */
  it("sem configuração, devolve as imagens embutidas", () => {
    const resolved = resolveHomeMedia(undefined);

    expect(resolved.hero).toEqual(DEFAULT_HERO);
    expect(resolved.lookbook).toEqual(DEFAULT_LOOKBOOK);
    expect(resolved.atelierBench).toEqual(DEFAULT_ATELIER_POSTERS.atelierBench);
  });

  it("configuração vazia é o mesmo que nenhuma", () => {
    expect(resolveHomeMedia({})).toEqual(resolveHomeMedia(undefined));
  });

  it("troca só o slot configurado, sem tocar nos outros", () => {
    const resolved = resolveHomeMedia({
      hero: { url: "https://pub-abc.r2.dev/produtos/novo.jpg", alt: "Nova vitrine" },
    });

    expect(resolved.hero).toEqual({
      url: "https://pub-abc.r2.dev/produtos/novo.jpg",
      alt: "Nova vitrine",
    });
    expect(resolved.atelierHero).toEqual(DEFAULT_ATELIER_POSTERS.atelierHero);
    expect(resolved.lookbook).toEqual(DEFAULT_LOOKBOOK);
  });

  /**
   * Trocar a foto e esquecer o texto alternativo é o erro fácil. Herdar a
   * descrição antiga seria descrever a imagem errada para quem usa leitor de
   * tela — pior que herdar a foto antiga junto.
   */
  it("imagem trocada sem texto alternativo herda o texto do padrão", () => {
    const resolved = resolveHomeMedia({ hero: { url: "/nova.jpg", alt: "  " } });

    expect(resolved.hero.url).toBe("/nova.jpg");
    expect(resolved.hero.alt).toBe(DEFAULT_HERO.alt);
  });

  it("slot com url em branco não conta como trocado", () => {
    expect(resolveHomeMedia({ hero: { url: "   ", alt: "x" } }).hero).toEqual(DEFAULT_HERO);
  });

  /**
   * A tira do lookbook é duplicada para rolar sem emenda; devolver menos de
   * seis encurtaria o laço e a costura ficaria visível.
   */
  it("o lookbook sempre volta com seis posições", () => {
    expect(resolveHomeMedia({ lookbook: [] }).lookbook).toHaveLength(6);
    expect(
      resolveHomeMedia({
        lookbook: [{ url: "/a.jpg", alt: "a", room: "Sala", place: "Centro" }],
      }).lookbook,
    ).toHaveLength(6);
  });

  it("troca uma posição do lookbook e mantém as outras", () => {
    const resolved = resolveHomeMedia({
      lookbook: [
        { url: "", alt: "", room: "", place: "" },
        { url: "/nova-2.jpg", alt: "Nova foto", room: "Cozinha", place: "Prata" },
      ],
    });

    expect(resolved.lookbook[0]).toEqual(DEFAULT_LOOKBOOK[0]);
    expect(resolved.lookbook[1]).toEqual({
      url: "/nova-2.jpg",
      alt: "Nova foto",
      room: "Cozinha",
      place: "Prata",
    });
    expect(resolved.lookbook[2]).toEqual(DEFAULT_LOOKBOOK[2]);
  });

  it("posição do lookbook sem cômodo/bairro herda os do padrão", () => {
    const resolved = resolveHomeMedia({
      lookbook: [{ url: "/nova.jpg", alt: "Nova", room: "", place: "" }],
    });

    expect(resolved.lookbook[0]).toMatchObject({
      url: "/nova.jpg",
      room: DEFAULT_LOOKBOOK[0].room,
      place: DEFAULT_LOOKBOOK[0].place,
    });
  });

  it("não devolve o mesmo objeto do padrão quando há troca", () => {
    const resolved = resolveHomeMedia({ hero: { url: "/x.jpg", alt: "X" } });
    expect(resolved.hero).not.toBe(DEFAULT_HERO);
    expect(DEFAULT_HERO.url).toBe("/images/products/vaso-canelado-01.jpg");
  });
});
