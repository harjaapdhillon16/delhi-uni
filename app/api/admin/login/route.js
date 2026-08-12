import { allowPinAttempt, correctAdminPin, createAdminSession, sameOrigin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!sameOrigin(request)) return Response.json({ error: "Cross-origin request rejected." }, { status: 403 });
  if (!allowPinAttempt(request)) {
    return Response.json({ error: "Too many PIN attempts. Try again in 15 minutes." }, { status: 429 });
  }

  const body = await request.json();
  if (!correctAdminPin(body.pin)) return Response.json({ error: "Incorrect admin PIN." }, { status: 401 });
  const session = createAdminSession();
  const secure = new URL(request.url).protocol === "https:";

  return Response.json(
    { ok: true, expiresAt: session.expiresAt },
    {
      headers: {
        "Set-Cookie": `delhi_uni_admin_session=${encodeURIComponent(session.token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secure ? "; Secure" : ""}`,
      },
    },
  );
}
