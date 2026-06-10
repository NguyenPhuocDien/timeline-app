export function sanitizeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/app";
  }

  try {
    const url = new URL(value, "https://timeline-focus.local");
    return url.origin === "https://timeline-focus.local"
      ? `${url.pathname}${url.search}${url.hash}`
      : "/app";
  } catch {
    return "/app";
  }
}
