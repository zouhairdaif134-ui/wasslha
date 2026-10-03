/**
 * WASSLHA
 * Backend Hash Helpers
 *
 * Cryptographic hashing helpers for request integrity
 * and idempotency support.
 *
 * Berrechid MVP.
 */

export async function sha256(
  value: string,
): Promise<string> {
  const encoder =
    new TextEncoder();

  const data =
    encoder.encode(value);

  const hashBuffer =
    await crypto.subtle.digest(
      "SHA-256",
      data,
    );

  const hashArray =
    Array.from(
      new Uint8Array(hashBuffer),
    );

  return hashArray
    .map(
      (byte) =>
        byte
          .toString(16)
          .padStart(2, "0"),
    )
    .join("");
}

export async function hashJson(
  value: unknown,
): Promise<string> {
  return sha256(
    JSON.stringify(value),
  );
}
