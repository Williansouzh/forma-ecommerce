import { UnauthorizedException } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import type { Model } from "mongoose";
import { AuthService } from "./auth.service";
import type { AppPairingDocument } from "./schemas/app-pairing.schema";
import type { UserDocument } from "./schemas/user.schema";

/** Coleção em memória com só o que o serviço usa: create e findOneAndDelete. */
function fakePairings() {
  const docs = new Map<string, { _id: string; userId: string; expiresAt: Date }>();
  return {
    docs,
    model: {
      create: jest.fn(async (doc: { _id: string; userId: string; expiresAt: Date }) => {
        docs.set(doc._id, doc);
        return doc;
      }),
      findOneAndDelete: jest.fn((filter: { _id: string; expiresAt: { $gt: Date } }) => ({
        exec: async () => {
          const doc = docs.get(filter._id);
          if (!doc || doc.expiresAt <= filter.expiresAt.$gt) return null;
          docs.delete(filter._id);
          return doc;
        },
      })),
    },
  };
}

const user = { _id: "u1", email: "ana@forma.test", name: "Ana", role: "superadmin" };

function service() {
  const pairings = fakePairings();
  const users = { findById: jest.fn(() => ({ exec: async () => user })) };
  const jwt = { sign: jest.fn(() => "jwt-token") };
  const auth = new AuthService(
    users as unknown as Model<UserDocument>,
    pairings.model as unknown as Model<AppPairingDocument>,
    jwt as unknown as JwtService,
  );
  return { auth, pairings, users };
}

describe("AuthService — QR code do app", () => {
  it("guarda só o hash e troca o código pela sessão do mesmo usuário", async () => {
    const { auth, pairings, users } = service();
    const { code, expiresAt } = await auth.createAppPairing("u1");

    expect(code.length).toBeGreaterThanOrEqual(32);
    expect(Date.parse(expiresAt)).toBeGreaterThan(Date.now());
    expect([...pairings.docs.keys()]).not.toContain(code);

    const session = await auth.exchangeAppPairing(code);
    expect(session.accessToken).toBe("jwt-token");
    expect(session.user.email).toBe("ana@forma.test");
    expect(users.findById).toHaveBeenCalledWith("u1");
  });

  it("o mesmo código não entra duas vezes", async () => {
    const { auth } = service();
    const { code } = await auth.createAppPairing("u1");
    await auth.exchangeAppPairing(code);
    await expect(auth.exchangeAppPairing(code)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("código expirado ou inventado é recusado", async () => {
    const { auth, pairings } = service();
    const { code } = await auth.createAppPairing("u1");
    for (const doc of pairings.docs.values()) doc.expiresAt = new Date(Date.now() - 1);

    await expect(auth.exchangeAppPairing(code)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(auth.exchangeAppPairing("x".repeat(32))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
