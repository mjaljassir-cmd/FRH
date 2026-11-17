import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.QR_SECRET = "test-secret";
});

describe("ticket QR signing", async () => {
  const { signTicket, verifyTicketPayload } = await import("./qr");

  it("round-trips a ticket id", () => {
    const p = signTicket("ckticket123");
    expect(verifyTicketPayload(p)).toBe("ckticket123");
  });

  it("rejects tampered payloads", () => {
    const p = signTicket("ckticket123");
    expect(verifyTicketPayload(p.replace("ckticket123", "ckticket124"))).toBeNull();
    expect(verifyTicketPayload("T1.abc")).toBeNull();
    expect(verifyTicketPayload("garbage")).toBeNull();
    expect(verifyTicketPayload(p.slice(0, -1) + (p.endsWith("A") ? "B" : "A"))).toBeNull();
  });
});
