/**
 * WASSLHA
 * Backend Cryptography Helpers
 *
 * Small Web Crypto helpers for server-side
 * cryptographic operations.
 *
 * Berrechid MVP.
 */

export function generateRandomBytes(
  length = 32,
): Uint8Array {
  if (
    !Number.isInteger(length) ||
    length <= 0 ||
    length > 1024
  ) {
    throw new Error(
      "Random byte length must be an integer between 1 and 1024",
    );
  }

  const bytes =
    new Uint8Array(length);

  crypto.getRandomValues(bytes);

  return bytes;
}

export function bytesToHex(
  bytes: Uint8Array,
): string {
  return Array.from(bytes)
    .map((byte) =>
      byte
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
}

export function generateRandomHex(
  length = 32,
): string {
  return bytesToHex(
    generateRandomBytes(length),
  );
}

export function constantTimeEqual(
  first: string,
  second: string,
): boolean {
  if (
    first.length !==
    second.length
  ) {
    return false;
  }

  let result = 0;

  for (
    let index = 0;
    index < first.length;
    index += 1
  ) {
    result |=
      first.charCodeAt(index) ^
      second.charCodeAt(index);
  }

  return result === 0;
}
