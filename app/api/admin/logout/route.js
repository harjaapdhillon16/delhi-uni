import { sameOrigin } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request) {
  if (!sameOrigin(request)) return Response.json({ error: "Cross-origin request rejected." }, { status: 403 });
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": "delhi_uni_admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
      },
    },
  );
}
