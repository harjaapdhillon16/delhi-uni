import { isAdminRequest, resultDocumentUrl, sameOrigin } from "@/lib/auth";
import { createResult, isDuplicateError, listResults, writeAudit } from "@/lib/db";
import { cleanText, resultFromRow, resultPdfFromForm, validateResultPayload } from "@/lib/results";
import { buildObjectKey, deletePdf, uploadPdf } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ipAddress(request) {
  return cleanText(request.headers.get("x-forwarded-for")?.split(",")[0] || "", 80);
}

export async function GET(request) {
  if (!isAdminRequest(request)) return Response.json({ error: "Admin authentication required." }, { status: 401 });
  const search = cleanText(new URL(request.url).searchParams.get("query"), 100);
  const rows = await listResults(search);
  return Response.json({
    results: rows.map((row) => resultFromRow(row, { pdfUrl: resultDocumentUrl(row.id) })),
  });
}

export async function POST(request) {
  if (!isAdminRequest(request)) return Response.json({ error: "Admin authentication required." }, { status: 401 });
  if (!sameOrigin(request)) return Response.json({ error: "Cross-origin request rejected." }, { status: 403 });

  let objectKey = null;
  try {
    const formData = await request.formData();
    const payload = validateResultPayload(JSON.parse(String(formData.get("payload") || "{}")));
    const pdf = await resultPdfFromForm(formData.get("resultPdf"));
    if (!pdf) throw new Error("Upload the score-card PDF for this record.");

    objectKey = buildObjectKey("delhi-uni-results", payload.examRollNumber);
    await uploadPdf(objectKey, pdf.buffer);
    const row = await createResult(payload, { ...pdf, objectKey });
    await writeAudit("created", row.id, ipAddress(request));
    return Response.json({ result: resultFromRow(row, { pdfUrl: resultDocumentUrl(row.id) }) }, { status: 201 });
  } catch (error) {
    // Never leave an orphaned object behind when the row could not be written.
    if (objectKey) await deletePdf(objectKey).catch(() => {});
    if (isDuplicateError(error)) {
      return Response.json(
        { error: "A result already exists for this college, exam roll number, email, and date of birth." },
        { status: 409 },
      );
    }
    if (error instanceof SyntaxError) return Response.json({ error: "Invalid result payload." }, { status: 400 });
    if (!error.code) return Response.json({ error: error.message }, { status: 400 });
    console.error("Create result failed:", error);
    return Response.json({ error: "The result could not be created." }, { status: 500 });
  }
}
