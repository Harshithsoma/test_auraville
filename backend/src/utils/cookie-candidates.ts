function tryDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function getCookieCandidates(params: {
  cookieHeader?: string | null;
  cookieName: string;
  parsedCookieValue?: string;
}): string[] {
  const values: string[] = [];

  if (params.parsedCookieValue && params.parsedCookieValue.trim().length > 0) {
    values.push(params.parsedCookieValue.trim());
  }

  const header = params.cookieHeader ?? "";
  if (!header.trim()) {
    return Array.from(new Set(values));
  }

  const target = params.cookieName.trim();
  if (!target) {
    return Array.from(new Set(values));
  }

  const segments = header.split(";");
  for (const segment of segments) {
    const [rawKey, ...rawValueParts] = segment.split("=");
    if (!rawKey || rawValueParts.length === 0) continue;
    const key = rawKey.trim();
    if (key !== target) continue;
    const value = tryDecode(rawValueParts.join("=").trim());
    if (value.length > 0) {
      values.push(value);
    }
  }

  return Array.from(new Set(values));
}

