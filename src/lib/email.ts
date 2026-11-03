/**
 * Email normalization utility.
 * Always normalizes emails by trimming, lowercasing, and applying Unicode NFC normalization.
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== "string") {
    throw new Error("Invalid email input");
  }
  return email.trim().toLowerCase().normalize("NFC");
}

/**
 * Validates basic email formatting according to standard RFC patterns.
 */
export function isValidEmail(email: string): boolean {
  const normalized = email.trim();
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(normalized);
}
