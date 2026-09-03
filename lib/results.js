export const maximumPdfBytes = 20 * 1024 * 1024;

export function cleanText(value, maximum = 160) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maximum);
}

export function normalizeIdentifier(value) {
  return cleanText(value, 80).replace(/\s+/g, "").toUpperCase();
}

export function normalizeEmail(value) {
  return cleanText(value, 160).toLowerCase();
}

/** The five values the public landing page asks for, normalized the same way on both sides. */
export function publicLookupPayload(input) {
  return {
    college: cleanText(input?.college, 180),
    examRollNumber: normalizeIdentifier(input?.examRollNumber),
    studentName: cleanText(input?.studentName, 120),
    email: normalizeEmail(input?.email),
    dateOfBirth: cleanText(input?.dateOfBirth, 10),
  };
}

export function validateResultPayload(input) {
  const payload = {
    ...publicLookupPayload(input),
    enrollmentNumber: normalizeIdentifier(input?.enrollmentNumber),
    programme: cleanText(input?.programme, 180),
    currentSemester: cleanText(input?.currentSemester, 40),
    examSession: cleanText(input?.examSession, 100),
    resultDeclaredOn: cleanText(input?.resultDeclaredOn, 10),
  };

  const missing = [
    ["college or department", payload.college],
    ["exam roll number", payload.examRollNumber],
    ["student name", payload.studentName],
    ["email address", payload.email],
    ["date of birth", payload.dateOfBirth],
  ].find(([, value]) => !value);

  if (missing) throw new Error(`Please provide the ${missing[0]}.`);
  if (!/^[A-Z0-9./-]{3,80}$/.test(payload.examRollNumber)) {
    throw new Error("Exam roll number contains unsupported characters.");
  }
  if (payload.enrollmentNumber && !/^[A-Z0-9./-]{3,80}$/.test(payload.enrollmentNumber)) {
    throw new Error("Enrollment number contains unsupported characters.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) throw new Error("Enter a valid email address.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.dateOfBirth)) throw new Error("Enter a valid date of birth.");
  if (payload.resultDeclaredOn && !/^\d{4}-\d{2}-\d{2}$/.test(payload.resultDeclaredOn)) {
    throw new Error("Enter a valid result declaration date.");
  }
  return payload;
}

export function resultFromRow(row, urls = {}) {
  return {
    id: Number(row.id),
    college: row.college,
    examRollNumber: row.exam_roll_no,
    enrollmentNumber: row.enrollment_no,
    studentName: row.student_name,
    email: row.email,
    dateOfBirth: row.date_of_birth,
    programme: row.programme,
    currentSemester: row.current_semester,
    examSession: row.exam_session,
    resultDeclaredOn: row.result_declared_on,
    pdfFilename: row.pdf_filename,
    pdfSizeBytes: Number(row.pdf_size_bytes || 0),
    pdfUrl: urls.pdfUrl || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Reads the uploaded score-card PDF, verifying it really is a PDF before it reaches storage. */
export async function resultPdfFromForm(file) {
  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) return null;
  if (file.size > maximumPdfBytes) throw new Error("The score-card PDF must be 20 MB or smaller.");
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("The uploaded score-card file must be a valid PDF.");
  }
  const filename = cleanText(file.name, 180).replace(/[^A-Za-z0-9._-]/g, "_") || "score-card.pdf";
  return {
    buffer,
    size: buffer.length,
    filename: filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`,
  };
}
