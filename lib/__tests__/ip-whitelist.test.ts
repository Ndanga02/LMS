import { describe, it, expect } from "vitest";
import { isIpAllowed } from "@/lib/ip-whitelist";

describe("isIpAllowed", () => {
  it("allows any IP when whitelist is empty", () => {
    expect(isIpAllowed("10.0.0.1", [])).toBe(true);
  });

  it("matches exact IPs", () => {
    expect(isIpAllowed("192.168.1.1", ["192.168.1.1"])).toBe(true);
    expect(isIpAllowed("192.168.1.2", ["192.168.1.1"])).toBe(false);
  });

  it("matches CIDR ranges", () => {
    expect(isIpAllowed("10.0.0.5", ["10.0.0.0/8"])).toBe(true);
    expect(isIpAllowed("11.0.0.5", ["10.0.0.0/8"])).toBe(false);
  });

  it("matches wildcard notation", () => {
    expect(isIpAllowed("192.168.1.1", ["192.168.*"])).toBe(true);
    expect(isIpAllowed("192.169.1.1", ["192.168.*"])).toBe(false);
  });
});
