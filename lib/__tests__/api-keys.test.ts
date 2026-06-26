import { describe, it, expect } from "vitest";
import { generateApiKey, hashApiKey } from "@/lib/api-keys";

describe("generateApiKey", () => {
  it("generates a key with the lms_ prefix", () => {
    const { raw } = generateApiKey();
    expect(raw.startsWith("lms_")).toBe(true);
  });

  it("generates a 68-character key (4 prefix + 64 hex)", () => {
    const { raw } = generateApiKey();
    expect(raw.length).toBe(68);
  });

  it("generates unique keys on successive calls", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.raw).not.toBe(b.raw);
  });
});

describe("hashApiKey", () => {
  it("returns a sha256 hex hash", () => {
    const hash = hashApiKey("lms_testkey123");
    expect(hash).toHaveLength(64);
    expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
  });

  it("returns the same hash for the same input", () => {
    const a = hashApiKey("lms_testkey123");
    const b = hashApiKey("lms_testkey123");
    expect(a).toBe(b);
  });

  it("returns different hashes for different inputs", () => {
    const a = hashApiKey("lms_key_one");
    const b = hashApiKey("lms_key_two");
    expect(a).not.toBe(b);
  });
});
