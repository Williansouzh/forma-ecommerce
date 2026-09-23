import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateOrderDto } from "./order.dto";

/** O pedido como a loja o monta, depois de passar pelo formulário. */
function pedido(customer: Record<string, unknown>) {
  return plainToInstance(CreateOrderDto, {
    items: [{ productId: "665f1c2b9a1e4a0012345678", quantity: 1 }],
    customer: {
      email: "maria@exemplo.com",
      firstName: "Maria",
      lastName: "Souza",
      phone: "83988887777",
      ...customer,
    },
    paymentMethod: "pix",
  });
}

describe("CreateOrderDto", () => {
  /**
   * O formulário da loja tem UM campo de nome e o divide no primeiro espaço.
   * Quem digita só "Maria" chega com `lastName: ""` — e antes disso a API
   * respondia 400 ("lastName must be longer than or equal to 1 characters")
   * e a compra não fechava.
   */
  it("aceita nome de uma palavra só, com sobrenome vazio", async () => {
    expect(await validate(pedido({ lastName: "" }))).toEqual([]);
  });

  it("continua exigindo o primeiro nome", async () => {
    const errors = await validate(pedido({ firstName: "" }));
    expect(errors.map((e) => e.property)).toContain("customer");
  });
});
