import crypto from "node:crypto";

const globalAuth = globalThis;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters.");
  return value;
}

function signature(payload) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

function equal(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function createAdminSession() {
  const expiresAt = Date.now() + 8 * 60 * 60 * 1000;
  const payload = Buffer.from(`admin.${expiresAt}`).toString("base64url");
  return { token: `${payload}.${signature(payload)}`, expiresAt };
}

export function validAdminSession(token) {
  const [payload, providedSignature] = String(token || "").split(".");
  if (!payload || !providedSignature || !equal(providedSignature, signature(payload))) return false;
  try {
    const [role, expiry] = Buffer.from(payload, "base64url").toString("utf8").split(".");
    return role === "admin" && Number(expiry) > Date.now();
  } catch {
    return false;
  }
}

export function cookieValue(request, name) {
  const cookie = request.headers.get("cookie") || "";
  for (const part of cookie.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return "";
}

export function isAdminRequest(request) {
  return validAdminSession(cookieValue(request, "delhi_uni_admin_session"));
}

export function correctAdminPin(candidate) {
  const expected = crypto.scryptSync(String(process.env.ADMIN_PIN || "1280"), secret().slice(0, 16), 32);
  const supplied = crypto.scryptSync(String(candidate || ""), secret().slice(0, 16), 32);
  return crypto.timingSafeEqual(expected, supplied);
}

export function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export function allowPinAttempt(request) {
  if (!globalAuth.__delhiUniversityPinAttempts) globalAuth.__delhiUniversityPinAttempts = new Map();
  const attempts = globalAuth.__delhiUniversityPinAttempts;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = forwarded || "local";
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || record.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (record.count >= 8) return false;
  record.count += 1;
  return true;
}

export function createMediaToken(resultId) {
  const expiry = Date.now() + 60 * 60 * 1000;
  const payload = Buffer.from(`${resultId}.${expiry}`).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function validMediaToken(token, resultId) {
  const [payload, providedSignature] = String(token || "").split(".");
  if (!payload || !providedSignature || !equal(providedSignature, signature(payload))) return false;
  try {
    const [id, expiry] = Buffer.from(payload, "base64url").toString("utf8").split(".");
    return String(resultId) === id && Number(expiry) > Date.now();
  } catch {
    return false;
  }
}

/** Short-lived, signed URL the browser uses to stream a score-card PDF through this app. */
export function resultDocumentUrl(resultId) {
  return `/api/results/${resultId}/document?token=${encodeURIComponent(createMediaToken(resultId))}`;
}
