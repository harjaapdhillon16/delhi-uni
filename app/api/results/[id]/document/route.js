import { isAdminRequest, validMediaToken } from "@/lib/auth";
import { findResultById } from "@/lib/db";
import { downloadPdf } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, context) {
  const { id: rawId } = await context.params;
  const id = Number.parseInt(rawId, 10);
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  // A signed short-lived token covers public viewers; a live admin session is also accepted.
  if (!Number.isInteger(id) || !(validMediaToken(token, id) || isAdminRequest(request))) {
    return Response.json({ error: "This score-card link is invalid or expired." }, { status: 404 });
  }

  const row = await findResultById(id);
  if (!row?.pdf_object_key) {
    return Response.json({ error: "Score-card document not found." }, { status: 404 });
  }

  let pdf;
  try {
    pdf = await downloadPdf(row.pdf_object_key);
  } catch (error) {
    console.error("Score-card download failed:", error);
    return Response.json({ error: "The score card could not be retrieved." }, { status: 502 });
  }
  if (!pdf) return Response.json({ error: "Score-card document not found." }, { status: 404 });

  const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";
  const filename = row.pdf_filename || "score-card.pdf";
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Content-Disposition": `${disposition}; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
