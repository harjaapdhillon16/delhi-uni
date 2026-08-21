import { resultDocumentUrl } from "@/lib/auth";
import { findPublicResult } from "@/lib/db";
import { publicLookupPayload, resultFromRow } from "@/lib/results";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const lookup = publicLookupPayload(await request.json());
    if (Object.values(lookup).some((value) => !value)) {
      return Response.json(
        { error: "Complete all mandatory fields before requesting the score card." },
        { status: 400 },
      );
    }

    const row = await findPublicResult(lookup);
    if (!row) {
      return Response.json(
        { error: "No matching result was found. Check the college and candidate details and try again." },
        { status: 404 },
      );
    }

    return Response.json({ result: resultFromRow(row, { pdfUrl: resultDocumentUrl(row.id) }) });
  } catch (error) {
    console.error("Result lookup failed:", error);
    return Response.json({ error: "The score-card request could not be completed." }, { status: 500 });
  }
}
