import { describe, expect, it } from "vitest";
import { isLocalHost } from "@/proxy";

describe("Host-ellenőrzés (DNS rebinding ellen)", () => {
  it.each(["127.0.0.1", "127.0.0.1:3210", "localhost:3000", "LOCALHOST", "[::1]:3210"])("helyi cím átmegy: %s", (h) => {
    expect(isLocalHost(h)).toBe(true);
  });
  it.each([null, "", "evil.example", "evil.example:3210", "127.0.0.1.evil.example", "localhost.evil.example:3210", "192.168.1.10:3210"])("idegen cím elutasítva: %s", (h) => {
    expect(isLocalHost(h)).toBe(false);
  });
});
