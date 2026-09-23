import { describe, expect, it } from "vitest";
import { customerFacingMessage } from "./api-error";

describe("customerFacingMessage", () => {
  it("repassa a recusa do domínio, que já é escrita para o cliente", () => {
    expect(
      customerFacingMessage({ message: '"Vaso Onda" saiu do ar.' }, "fallback")
    ).toBe('"Vaso Onda" saiu do ar.');
  });

  /** O que o cliente lia antes: o texto cru do ValidationPipe, em inglês. */
  it("não mostra a lista do ValidationPipe", () => {
    const message = customerFacingMessage(
      { message: ["customer.lastName must be longer than or equal to 1 characters"] },
      "fallback"
    );
    expect(message).not.toMatch(/lastName|must be/);
    expect(message).toMatch(/Revise o formulário/);
  });

  it.each([
    ["sem corpo", null],
    ["sem mensagem", {}],
    ["mensagem vazia", { message: "  " }],
  ])("%s cai no texto padrão", (_caso, detail) => {
    expect(customerFacingMessage(detail, "Não foi possível registrar o pedido")).toBe(
      "Não foi possível registrar o pedido"
    );
  });
});
