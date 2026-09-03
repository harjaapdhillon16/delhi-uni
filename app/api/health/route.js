import { databaseHealth } from "@/lib/db";
import { bucketName, storageHealth } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await databaseHealth();
  } catch (error) {
    console.error("Database health check failed:", error);
    return Response.json({ ok: false, error: "Database connection failed." }, { status: 503 });
  }

  try {
    await storageHealth();
  } catch (error) {
    console.error("Storage health check failed:", error);
    return Response.json({ ok: false, error: "Supabase storage is unreachable." }, { status: 503 });
  }

  return Response.json({ ok: true, database: "mysql", storage: `supabase:${bucketName()}` });
}
