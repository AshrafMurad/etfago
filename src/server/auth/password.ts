import { hash, verify } from "@node-rs/argon2";

const options = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

const dummyHash = hash("etfago-dummy-password-not-used", options);

export function hashPassword(password: string): Promise<string> {
  return hash(password, options);
}

export async function verifyPassword(password: string, passwordHash?: string | null): Promise<boolean> {
  try {
    const valid = await verify(passwordHash ?? await dummyHash, password);
    return Boolean(passwordHash) && valid;
  } catch {
    return false;
  }
}
