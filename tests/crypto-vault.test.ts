import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "../src/utils/crypto-vault.js";

describe("crypto vault", () => {
  it("encrypts and decrypts credentials", () => {
    const plain = "market-user:super-secret";
    const cipher = encryptSecret(plain);
    expect(cipher).not.toEqual(plain);
    expect(decryptSecret(cipher)).toEqual(plain);
  });
});
