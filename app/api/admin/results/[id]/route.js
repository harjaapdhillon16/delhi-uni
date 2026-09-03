import { isAdminRequest, resultDocumentUrl, sameOrigin } from "@/lib/auth";
import { deleteResult, findResultById, isDuplicateError, updateResult, writeAudit } from "@/lib/db";
import { cleanText, resultFromRow, resultPdfFromForm, validateResultPayload } from "@/lib/results";
import { buildObjectKey, deletePdf, uploadPdf } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ipAddress(request) {
  return cleanText(request.headers.get("x-forwarded-for")?.split(",")[0] || "", 80);
}

async function resultId(context) {
  const { id } = await context.params;
  return Number.parseInt(id, 10);
}

export async function PUT(request, context) {
  if (!isAdminRequest(request)) return Response.json({ error: "Admin authentication required." }, { status: 401 });
  if (!sameOrigin(request)) return Response.json({ error: "Cross-origin request rejected." }, { status: 403 });

  const id = await resultId(context);
  const existing = Number.isInteger(id) ? await findResultById(id) : null;
  if (!existing) return Response.json({ error: "Result record not found." }, { status: 404 });

  let objectKey = null;
  try {
    const formData = await request.formData();
    const payload = validateResultPayload(JSON.parse(String(formData.get("payload") || "{}")));
    const pdf = await resultPdfFromForm(formData.get("resultPdf"));

    if (pdf) {
      objectKey = buildObjectKey("delhi-uni-results", payload.examRollNumber);
      await uploadPdf(objectKey, pdf.buffer);
    }
    const row = await updateResult(id, payload, pdf ? { ...pdf, objectKey } : null);
    // The superseded object is only removed once the row points at the replacement.
    if (pdf && existing.pdf_object_key) await deletePdf(existing.pdf_object_key).catch(() => {});
    await writeAudit("updated", id, ipAddress(request));
    return Response.json({ result: resultFromRow(row, { pdfUrl: resultDocumentUrl(row.id) }) });
  } catch (error) {
    if (objectKey) await deletePdf(objectKey).catch(() => {});
    if (isDuplicateError(error)) {
      return Response.json(
        { error: "A result already exists for this college, exam roll number, email, and date of birth." },
        { status: 409 },
      );
    }
    if (error instanceof SyntaxError) return Response.json({ error: "Invalid result payload." }, { status: 400 });
    if (!error.code) return Response.json({ error: error.message }, { status: 400 });
    console.error("Update result failed:", error);
    return Response.json({ error: "The result could not be updated." }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  if (!isAdminRequest(request)) return Response.json({ error: "Admin authentication required." }, { status: 401 });
  if (!sameOrigin(request)) return Response.json({ error: "Cross-origin request rejected." }, { status: 403 });

  const id = await resultId(context);
  const existing = Number.isInteger(id) ? await findResultById(id) : null;
  if (!existing) return Response.json({ error: "Result record not found." }, { status: 404 });

  await deleteResult(id);
  if (existing.pdf_object_key) await deletePdf(existing.pdf_object_key).catch(() => {});
  await writeAudit("deleted", id, ipAddress(request));
  return Response.json({ ok: true });
}
