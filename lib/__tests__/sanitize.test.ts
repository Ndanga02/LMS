import { describe, it, expect } from "vitest";
import { escapeHtml, validateUrl, containsXss } from "@/lib/sanitize";

describe("escapeHtml", () => {
  it("escapes & < > \" '", () => {
    expect(escapeHtml(`<script>alert("xss")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
    );
  });

  it("passes through safe strings", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });
});

describe("validateUrl", () => {
  it("accepts https urls", () => {
    expect(validateUrl("https://example.com")).toBe("https://example.com");
  });

  it("rejects javascript: urls", () => {
    expect(validateUrl("javascript:alert(1)")).toBeNull();
  });

  it("rejects invalid urls", () => {
    expect(validateUrl("not a url")).toBeNull();
  });
});

describe("containsXss", () => {
  it("detects script tags", () => {
    expect(containsXss("<script>alert(1)</script>")).toBe(true);
  });

  it("detects event handlers", () => {
    expect(containsXss('onclick="alert(1)"')).toBe(true);
  });

  it("passes safe content", () => {
    expect(containsXss("hello world")).toBe(false);
  });
});
