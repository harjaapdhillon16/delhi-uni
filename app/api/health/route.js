import { databaseHealth } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await databaseHealth();
    return Response.json({ ok: true, database: "mysql" });
  } catch (error) {
    console.error("Database health check failed:", error);
    return Response.json({ ok: false, error: "Database connection failed." }, { status: 503 });
  }
}
