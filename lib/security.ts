import crypto from "crypto";

const HASH_SALT = process.env.HASH_SALT || "iit_research_academic_salt_2026";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "academic_secure_password_2026";
const RECAPTCHA_SECRET_KEY =
  process.env.RECAPTCHA_SECRET_KEY ||
  process.env.TURNSTILE_SECRET_KEY ||
  "6LeIxacZAAAAA_RECAPTCHA_SECRET_KEY_PLACEHOLDER";

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
 * Generate a deterministic secure token for admin session
 */
export function generateAdminToken(): string {
  return crypto
    .createHash("sha256")
    .update(ADMIN_PASSWORD.trim() + ":academic_session_salt")
    .digest("hex");
}

/**
 * Verify whether an admin token or password is valid
 */
export function isValidAdminToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const expected = generateAdminToken();
  const trimmed = token.trim();
  return trimmed === expected || trimmed === ADMIN_PASSWORD.trim();
}

/**
 * Verify Google reCAPTCHA v3 token.
 * In development mode or with dummy/test tokens, passes verification automatically.
 */
export async function verifyRecaptchaToken(
  token: string,
  remoteip?: string
): Promise<{ success: boolean; score?: number; error?: string }> {
  if (!token) {
    return { success: false, error: "Missing reCAPTCHA token." };
  }

  // Allow dummy/development bypass
  if (
    process.env.NODE_ENV === "development" ||
    token === "XXXX.DUMMY.TOKEN.XXXX" ||
    token.startsWith("test_") ||
    RECAPTCHA_SECRET_KEY.includes("PLACEHOLDER") ||
    RECAPTCHA_SECRET_KEY.startsWith("1x00000")
  ) {
    return { success: true, score: 0.9 };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", RECAPTCHA_SECRET_KEY);
    formData.append("response", token);
    if (remoteip) {
      formData.append("remoteip", remoteip);
    }

    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      body: formData,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
    });

    const data = await res.json();

    if (!data.success) {
      return {
        success: false,
        error: `reCAPTCHA verification failed: ${data["error-codes"]?.join(", ") || "Unknown error"}`,
      };
    }

    // Google reCAPTCHA v3 returns a score between 0.0 (bot) and 1.0 (human)
    const score = typeof data.score === "number" ? data.score : 1.0;
    if (score < 0.4) {
      return {
        success: false,
        score,
        error: "reCAPTCHA score too low. Suspicious activity detected.",
      };
    }

    return { success: true, score };
  } catch (err: any) {
    console.error("Google reCAPTCHA verification error:", err);
    return { success: false, error: "Failed to connect to reCAPTCHA verification service." };
  }
}

/**
 * Backward compatibility alias
 */
export async function verifyTurnstileToken(token: string, remoteip?: string): Promise<boolean> {
  const res = await verifyRecaptchaToken(token, remoteip);
  return res.success;
}
