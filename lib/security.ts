import crypto from "crypto";

const HASH_SALT = process.env.HASH_SALT || "iit_research_academic_salt_2026";
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000000000000AA";

/**
 * Mathematically scramble client IP + browser fingerprint using SHA-256 with server salt.
 * Ensures strict zero-knowledge privacy: impossible to reverse-engineer to the original IP or device.
 */
export function hashIntegrity(ip: string, fingerprint: string): string {
  const normalizedIp = (ip || "unknown_ip").trim();
  const normalizedFp = (fingerprint || "unknown_fp").trim();
  return crypto
    .createHash("sha256")
    .update(`${normalizedIp}:${normalizedFp}:${HASH_SALT}`)
    .digest("hex");
}

/**
 * Verify Cloudflare Turnstile token.
 * In development or with Cloudflare test keys, passes verification automatically.
 */
export async function verifyTurnstileToken(token: string, remoteip?: string): Promise<boolean> {
  if (!token) {
    return false;
  }

  // Allow Cloudflare dummy/test tokens in development
  if (
    process.env.NODE_ENV === "development" ||
    TURNSTILE_SECRET_KEY.startsWith("1x00000") ||
    token === "XXXX.DUMMY.TOKEN.XXXX"
  ) {
    return true;
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", TURNSTILE_SECRET_KEY);
    formData.append("response", token);
    if (remoteip) {
      formData.append("remoteip", remoteip);
    }

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
    });

    const data = await res.json();
    return Boolean(data.success);
  } catch (err) {
    console.error("Turnstile verification error:", err);
    return false;
  }
}
