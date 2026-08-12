import { isAdminRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!isAdminRequest(request)) return Response.json({ authenticated: false }, { status: 401 });
  return Response.json({ authenticated: true });
}
