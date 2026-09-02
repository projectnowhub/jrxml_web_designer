const VERIFIER_KEY = "cdp_pkce_verifier";

export function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function generatePKCE(): Promise<{
  verifier: string;
  challenge: string;
}> {
  const verifier = generateRandomString(32);
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const challenge = base64urlEncode(hash);

  return { verifier, challenge };
}

export function saveVerifier(verifier: string): void {
  sessionStorage.setItem(VERIFIER_KEY, verifier);
}

export function getVerifier(): string | null {
  return sessionStorage.getItem(VERIFIER_KEY);
}

export function clearVerifier(): void {
  sessionStorage.removeItem(VERIFIER_KEY);
}

export function getClientId(fallback: string): string {
  return fallback || "cdp-contractor";
}
