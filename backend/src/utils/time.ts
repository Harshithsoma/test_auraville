const TTL_PATTERN = /^(\d+)([smhd])$/;

export function parseTtlToMs(ttl: string): number {
  const match = TTL_PATTERN.exec(ttl.trim());

  if (!match) {
    throw new Error(`Invalid TTL format: ${ttl}`);
  }

  const value = Number(match[1]);
  const unit = match[2];

  if (unit === "s") return value * 1000;
  if (unit === "m") return value * 60 * 1000;
  if (unit === "h") return value * 60 * 60 * 1000;
  return value * 24 * 60 * 60 * 1000;
}
