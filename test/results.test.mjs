import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeEmail,
  normalizeIdentifier,
  publicLookupPayload,
  resultPdfFromForm,
  validateResultPayload,
} from "../lib/results.js";

const validPayload = {
  college: "Ramjas College",
  examRollNumber: " 2401 1001 ",
  studentName: "Aarav Sharma",
  email: " AARAV@example.com ",
  dateOfBirth: "2004-02-17",
  enrollmentNumber: "du-2023-001",
  programme: "Bachelor of Commerce (Honours)",
  currentSemester: "VI",
  examSession: "Semester Examination May-June 2026",
  resultDeclaredOn: "2026-07-20",
};

function pdfFile(bytes, { name = "score-card.pdf" } = {}) {
  const buffer = Buffer.from(bytes);
  return {
    name,
    size: buffer.length,
    arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.length),
  };
}

test("the lookup fields are normalized the same way for admin and public input", () => {
  const payload = validateResultPayload(validPayload);
  assert.equal(payload.examRollNumber, "24011001");
  assert.equal(payload.email, "aarav@example.com");
  assert.equal(payload.enrollmentNumber, "DU-2023-001");

  const lookup = publicLookupPayload({ ...validPayload, examRollNumber: "2401 1001" });
  assert.equal(lookup.examRollNumber, payload.examRollNumber);
  assert.equal(lookup.email, payload.email);
  assert.equal(normalizeEmail(" Test@Example.COM "), "test@example.com");
  assert.equal(normalizeIdentifier(" du 24 / 1 "), "DU24/1");
});

test("missing lookup fields and malformed values are rejected", () => {
  assert.throws(() => validateResultPayload({ ...validPayload, college: "" }), /college or department/);
  assert.throws(() => validateResultPayload({ ...validPayload, email: "not-an-email" }), /valid email/);
  assert.throws(() => validateResultPayload({ ...validPayload, dateOfBirth: "17-02-2004" }), /date of birth/);
  assert.throws(() => validateResultPayload({ ...validPayload, examRollNumber: "ABC @ 12" }), /unsupported characters/);
});

test("only real PDF uploads are accepted", async () => {
  const accepted = await resultPdfFromForm(pdfFile("%PDF-1.7\nscore card body"));
  assert.equal(accepted.filename, "score-card.pdf");
  assert.equal(accepted.size, Buffer.from("%PDF-1.7\nscore card body").length);

  await assert.rejects(() => resultPdfFromForm(pdfFile("<html>not a pdf</html>")), /valid PDF/);
  assert.equal(await resultPdfFromForm(null), null);
});

test("an uploaded name without an extension still gets one", async () => {
  const uploaded = await resultPdfFromForm(pdfFile("%PDF-1.4 body", { name: "sem 6 result" }));
  assert.equal(uploaded.filename, "sem_6_result.pdf");
});
