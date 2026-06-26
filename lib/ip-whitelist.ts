import { isIP, isIPv4 } from "net";

function ipToLong(ip: string): number | null {
  if (!isIPv4(ip)) return null;
  const parts = ip.split(".").map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function parseCidr(cidr: string): { network: number; mask: number } | null {
  const [ip, bits] = cidr.split("/");
  if (!ip || !bits) return null;
  const b = parseInt(bits, 10);
  if (isNaN(b) || b < 0 || b > 32) return null;
  const long = ipToLong(ip);
  if (long === null) return null;
  const mask = ~0 << (32 - b);
  return { network: long & mask, mask };
}

function ipInCidr(ip: string, cidr: string): boolean {
  const parsed = parseCidr(cidr);
  if (!parsed) return false;
  const long = ipToLong(ip);
  if (long === null) return false;
  return (long & parsed.mask) === parsed.network;
}

/**
 * Check if the given IP is in the allowed list.
 * Entries can be:
 *   - exact IPv4 (e.g. "192.168.1.1")
 *   - CIDR range (e.g. "10.0.0.0/8")
 *   - wildcard (e.g. "192.168.*" — converted to "192.168.0.0/16")
 */
export function isIpAllowed(ip: string, allowedIps: string[]): boolean {
  if (!isIP(ip)) return allowedIps.length === 0;
  if (allowedIps.length === 0) return true;

  return allowedIps.some((entry) => {
    const trimmed = entry.trim();
    if (!trimmed) return false;

    // CIDR notation
    if (trimmed.includes("/")) {
      return ipInCidr(ip, trimmed);
    }

    // Wildcard notation (e.g. "10.*", "192.168.*")
    if (trimmed.includes("*")) {
      const parts = trimmed.split(".");
      const starIdx = parts.findIndex((p) => p === "*");
      const maskBits = starIdx * 8;
      const prefix = parts.slice(0, starIdx).join(".");
      if (maskBits <= 0 || !prefix) return false;
      const zeroCount = 4 - starIdx;
      const zeros = Array.from({ length: zeroCount }, () => "0").join(".");
      const cidr = `${prefix}.${zeros}/${maskBits}`;
      return ipInCidr(ip, cidr);
    }

    // Exact match
    return ip === trimmed;
  });
}
