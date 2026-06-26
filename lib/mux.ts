export function isMuxVideo(url: string): boolean {
  if (!url) return false;
  if (url.includes("stream.mux.com") || url.includes("mux.com") || url.startsWith("mux:")) return true;
  if (/^[a-zA-Z0-9]{15,}$/.test(url.trim())) return true;
  return false;
}

export function getMuxPlaybackId(url: string): string | null {
  const trimmed = url.trim();
  if (trimmed.includes("stream.mux.com/")) {
    const match = trimmed.match(/stream\.mux\.com\/([^.?/]+)/);
    return match ? match[1] : null;
  }
  if (trimmed.startsWith("mux:")) {
    return trimmed.replace("mux:", "");
  }
  if (/^[a-zA-Z0-9]{15,}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}
