import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeEmail,
  normalizeIdentifier,
  publicLookupPayload,
  validateResultPayload,
} from "../lib/results.js";

const validPayload = {
  college: "Ramjas College",
  examRollNumber: " 2401 1001 ",
  enrollmentNumber: "du-2023-001",
  studentName: "Aarav Sharma",
  email: " AARAV@example.com ",
  dateOfBirth: "2004-02-17",
  programme: "Bachelor of Commerce (Honours)",
  currentSemester: "VI",
  fatherName: "Rakesh Sharma",
  motherName: "Meena Sharma",
  examSession: "Semester Examination May-June 2026",
  resultStatus: "Pass",
  cgpa: "8.45",
  totalCredits: "44",
  resultDeclaredOn: "2026-07-20",
  statementNumber: "demo-001",
  remarks: "Promoted to the next semester",
  semesters: [{
    label: "Semester II",
    sgpa: "8.45",
    totalCredit: "22",
    totalCreditPoint: "186",
    result: "Pass",
    cgpa: "8.45",
    courses: [{ paperCode: "2412081201", appearingStatus: "*", paperName: "Business Laws", paperType: "Core", credits: "4", grade: "A", gradePoint: "8", creditPoint: "32" }],
  }],
};

test("Delhi score-card payload normalizes lookup fields and paper rows", () => {
  const result = validateResultPayload(validPayload);
  assert.equal(result.examRollNumber, "24011001");
  assert.equal(result.enrollmentNumber, "DU-2023-001");
  assert.equal(result.email, "aarav@example.com");
  assert.equal(result.semesters[0].courses[0].paperName, "Business Laws");
});

test("invalid CGPA and unsupported identifiers are rejected", () => {
  assert.throws(() => validateResultPayload({ ...validPayload, cgpa: "12" }), /CGPA/);
  assert.throws(() => validateResultPayload({ ...validPayload, examRollNumber: "ABC @ 12" }), /unsupported characters/);
});

test("public lookup is normalized consistently", () => {
  const lookup = publicLookupPayload(validPayload);
  assert.equal(lookup.examRollNumber, "24011001");
  assert.equal(lookup.email, "aarav@example.com");
  assert.equal(normalizeEmail(" Test@Example.COM "), "test@example.com");
  assert.equal(normalizeIdentifier(" du 24 / 1 "), "DU24/1");
});
