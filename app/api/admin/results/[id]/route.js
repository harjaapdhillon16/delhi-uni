import { isAdminRequest, sameOrigin } from "@/lib/auth";
import {
  deleteResult,
  findResultById,
  isDuplicateError,
  updateResult,
  writeAudit,
} from "@/lib/db";
import { cleanText, resultFromRow, validateResultPayload } from "@/lib/results";

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
  if (!Number.isInteger(id) || !(await findResultById(id))) {
    return Response.json({ error: "Result record not found." }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const payload = validateResultPayload(JSON.parse(String(formData.get("payload") || "{}")));
    const row = await updateResult(id, payload);
    await writeAudit("updated", id, ipAddress(request));
    return Response.json({ result: resultFromRow(row) });
  } catch (error) {
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
  if (!Number.isInteger(id) || !(await findResultById(id))) {
    return Response.json({ error: "Result record not found." }, { status: 404 });
  }
  await deleteResult(id);
  await writeAudit("deleted", id, ipAddress(request));
  return Response.json({ ok: true });
}
