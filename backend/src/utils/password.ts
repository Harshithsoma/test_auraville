import argon2 from "argon2";
import { env } from "../config/env";

function applyPasswordPepper(password: string): string {
  if (!env.PASSWORD_HASH_PEPPER) {
    return password;
  }

  return `${password}:${env.PASSWORD_HASH_PEPPER}`;
}

export async function passwordHash(password: string): Promise<string> {
  const candidate = applyPasswordPepper(password);

  return argon2.hash(candidate, {
    type: argon2.argon2id
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const candidate = applyPasswordPepper(password);

  try {
    return await argon2.verify(hash, candidate);
  } catch {
    return false;
  }
}
