import { createHash, randomBytes } from "node:crypto";

export function generateApiKey() {
  const raw = `lms_${randomBytes(32).toString("hex")}`;
  return {
    raw,
    hash: hashApiKey(raw),
  };
}

export function hashApiKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}