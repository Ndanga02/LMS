import { describe, it, expect } from "vitest";

const { validateMagicBytes } = await import("@/lib/file-validation");

function bufferFromHex(hex: string): Buffer {
  return Buffer.from(hex.replace(/\s+/g, ""), "hex");
}

describe("validateMagicBytes", () => {
  it("should accept PNG with valid magic bytes", () => {
    const buf = bufferFromHex("89 50 4E 47 0D 0A 1A 0A 00 00 00 0D");
    expect(validateMagicBytes(buf, "image/png")).toBe(true);
  });

  it("should reject PNG with invalid magic bytes", () => {
    const buf = Buffer.from("not a png");
    expect(validateMagicBytes(buf, "image/png")).toBe(false);
  });

  it("should accept JPEG with valid magic bytes (FF D8 FF E0)", () => {
    const buf = bufferFromHex("FF D8 FF E0 00 10 4A 46 49 46");
    expect(validateMagicBytes(buf, "image/jpeg")).toBe(true);
  });

  it("should accept JPEG with valid magic bytes (FF D8 FF E1)", () => {
    const buf = bufferFromHex("FF D8 FF E1 00 10 45 78 69 66");
    expect(validateMagicBytes(buf, "image/jpeg")).toBe(true);
  });

  it("should reject JPEG with invalid magic bytes", () => {
    const buf = Buffer.from("not a jpeg");
    expect(validateMagicBytes(buf, "image/jpeg")).toBe(false);
  });

  it("should accept PDF with %PDF header", () => {
    const buf = bufferFromHex("25 50 44 46 2D 31 2E 34");
    expect(validateMagicBytes(buf, "application/pdf")).toBe(true);
  });

  it("should reject PDF without %PDF header", () => {
    const buf = Buffer.from("not a pdf");
    expect(validateMagicBytes(buf, "application/pdf")).toBe(false);
  });

  it("should accept ZIP with PK\x03\x04 magic", () => {
    const buf = bufferFromHex("50 4B 03 04 14 00 00 00");
    expect(validateMagicBytes(buf, "application/zip")).toBe(true);
  });

  it("should accept ZIP with PK\x05\x06 (empty archive)", () => {
    const buf = bufferFromHex("50 4B 05 06 00 00 00 00");
    expect(validateMagicBytes(buf, "application/zip")).toBe(true);
  });

  it("should reject ZIP without PK magic", () => {
    const buf = Buffer.from("not a zip");
    expect(validateMagicBytes(buf, "application/zip")).toBe(false);
  });

  it("should accept GIF89a", () => {
    const buf = bufferFromHex("47 49 46 38 39 61 00 00");
    expect(validateMagicBytes(buf, "image/gif")).toBe(true);
  });

  it("should accept GIF87a", () => {
    const buf = bufferFromHex("47 49 46 38 37 61 00 00");
    expect(validateMagicBytes(buf, "image/gif")).toBe(true);
  });

  it("should reject GIF with wrong magic", () => {
    const buf = Buffer.from("not a gif");
    expect(validateMagicBytes(buf, "image/gif")).toBe(false);
  });

  it("should accept WebP (RIFF....WEBP)", () => {
    const buf = bufferFromHex("52 49 46 46 00 00 00 00 57 45 42 50");
    expect(validateMagicBytes(buf, "image/webp")).toBe(true);
  });

  it("should reject WebP without WEBP marker", () => {
    const buf = Buffer.from("not a webp");
    expect(validateMagicBytes(buf, "image/webp")).toBe(false);
  });

  it("should pass SVG without magic byte check", () => {
    const buf = Buffer.from("<svg></svg>");
    expect(validateMagicBytes(buf, "image/svg+xml")).toBe(true);
  });

  it("should pass unknown MIME types", () => {
    const buf = Buffer.from("anything");
    expect(validateMagicBytes(buf, "text/plain")).toBe(true);
  });

  it("should reject when buffer is shorter than signature", () => {
    const buf = Buffer.from("PK");
    expect(validateMagicBytes(buf, "application/zip")).toBe(false);
  });

  it("should accept OOXML documents (ZIP-based)", () => {
    const buf = bufferFromHex("50 4B 03 04 14 00 06 00");
    expect(validateMagicBytes(buf, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(true);
  });

  it("should accept OLE2 documents (CFB format)", () => {
    const buf = bufferFromHex("D0 CF 11 E0 A1 B1 1A E1");
    expect(validateMagicBytes(buf, "application/msword")).toBe(true);
  });
});
