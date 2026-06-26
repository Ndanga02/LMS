const ENTITY_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => ENTITY_MAP[ch] ?? ch);
}

const ALLOWED_PROTOCOLS = ["http:", "https:", "mailto:"];

export function validateUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}

const SCRIPT_TAG_RE = /<script[\s>]/i;
const ON_EVENT_RE = /^\s*on\w+\s*=/i;

export function containsXss(input: string): boolean {
  return SCRIPT_TAG_RE.test(input) || input.split("\n").some((line) => ON_EVENT_RE.test(line.trim()));
}
