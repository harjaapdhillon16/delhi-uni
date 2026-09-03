import crypto from "node:crypto";

const globalStorage = globalThis;

/** Accepts either the project URL or the REST endpoint and returns the project origin. */
export function storageBaseUrl() {
  const raw = process.env.SUPABASE_URL;
  if (!raw) throw new Error("SUPABASE_URL is not configured.");
  return raw.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
}

function serviceKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return key.trim();
}

export function bucketName() {
  return process.env.SUPABASE_BUCKET || "objects";
}

function authHeaders(extra = {}) {
  const key = serviceKey();
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

function objectUrl(objectKey) {
  const encoded = objectKey.split("/").map(encodeURIComponent).join("/");
  return `${storageBaseUrl()}/storage/v1/object/${bucketName()}/${encoded}`;
}

async function failure(response, action) {
  const detail = await response.text().catch(() => "");
  return new Error(`Supabase storage ${action} failed (${response.status}). ${detail.slice(0, 300)}`);
}

/** Creates the bucket on first use so a fresh project works without manual setup. */
export async function ensureBucket() {
  if (!globalStorage.__supabaseBucketReady) {
    globalStorage.__supabaseBucketReady = (async () => {
      const bucket = bucketName();
      const existing = await fetch(`${storageBaseUrl()}/storage/v1/bucket/${encodeURIComponent(bucket)}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (existing.ok) return bucket;

      const created = await fetch(`${storageBaseUrl()}/storage/v1/bucket`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          id: bucket,
          name: bucket,
          public: false,
          file_size_limit: 26_214_400,
          allowed_mime_types: ["application/pdf"],
        }),
      });
      // A parallel request may have created it first; that conflict is not an error.
      if (!created.ok && created.status !== 409) throw await failure(created, "bucket creation");
      return bucket;
    })().catch((error) => {
      globalStorage.__supabaseBucketReady = null;
      throw error;
    });
  }
  return globalStorage.__supabaseBucketReady;
}

export function buildObjectKey(prefix, identifier) {
  const folder = String(identifier || "record")
    .replace(/[^A-Za-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "record";
  return `${prefix}/${folder}/${crypto.randomUUID()}.pdf`;
}

export async function uploadPdf(objectKey, buffer) {
  await ensureBucket();
  const response = await fetch(objectUrl(objectKey), {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/pdf", "x-upsert": "true", "cache-control": "3600" }),
    body: buffer,
  });
  if (!response.ok) throw await failure(response, "upload");
  return objectKey;
}

export async function downloadPdf(objectKey) {
  await ensureBucket();
  const response = await fetch(objectUrl(objectKey), { headers: authHeaders(), cache: "no-store" });
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) throw await failure(response, "download");
  return Buffer.from(await response.arrayBuffer());
}

export async function deletePdf(objectKey) {
  if (!objectKey) return;
  await ensureBucket();
  const response = await fetch(objectUrl(objectKey), { method: "DELETE", headers: authHeaders() });
  if (!response.ok && response.status !== 404) throw await failure(response, "delete");
}

export async function storageHealth() {
  await ensureBucket();
  const response = await fetch(`${storageBaseUrl()}/storage/v1/bucket/${encodeURIComponent(bucketName())}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!response.ok) throw await failure(response, "health check");
}
