// Git's blob id: SHA-1 over "blob <length>\0" + the bytes.

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** The blob id of `bytes`, or null when SubtleCrypto is missing (callers then compare bytes). */
export async function blobId(bytes: Uint8Array): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const header = new TextEncoder().encode("blob " + bytes.length + "\0");
  const data = new Uint8Array(header.length + bytes.length);
  data.set(header, 0);
  data.set(bytes, header.length);
  return hex(await subtle.digest("SHA-1", data));
}
