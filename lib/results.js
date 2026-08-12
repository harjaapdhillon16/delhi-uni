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

function numericText(value, maximum, label) {
  const output = cleanText(value, 12);
  if (output && (!/^\d{1,4}(?:\.\d{1,2})?$/.test(output) || Number(output) > maximum)) {
    throw new Error(`${label} must be a number from 0 to ${maximum}.`);
  }
  return output;
}

function parseSemesters(value) {
  const source = Array.isArray(value) ? value : [];
  if (source.length > 12) throw new Error("A score card can contain no more than 12 semesters.");

  let totalCourses = 0;
  const semesters = source.map((semester, semesterIndex) => {
    const sourceCourses = Array.isArray(semester?.courses) ? semester.courses : [];
    if (sourceCourses.length > 30) throw new Error("Each semester can contain no more than 30 papers.");
    totalCourses += sourceCourses.length;

    return {
      label: cleanText(semester?.label, 40) || String(semesterIndex + 1),
      sgpa: numericText(semester?.sgpa, 10, "SGPA"),
      totalCredit: numericText(semester?.totalCredit, 250, "Total credit"),
      totalCreditPoint: numericText(semester?.totalCreditPoint, 9999, "Total credit point"),
      result: cleanText(semester?.result, 40),
      cgpa: numericText(semester?.cgpa, 10, "Semester cumulative CGPA"),
      courses: sourceCourses
        .map((course) => ({
          paperCode: cleanText(course?.paperCode, 40),
          appearingStatus: cleanText(course?.appearingStatus, 16),
          paperName: cleanText(course?.paperName, 180),
          paperType: cleanText(course?.paperType, 40),
          credits: numericText(course?.credits, 99, "Credits"),
          grade: cleanText(course?.grade, 12),
          gradePoint: numericText(course?.gradePoint, 10, "Grade point"),
          creditPoint: numericText(course?.creditPoint, 999, "Credit point"),
        }))
        .filter((course) => Object.values(course).some(Boolean)),
    };
  });

  if (totalCourses > 150) throw new Error("A score card can contain no more than 150 papers.");
  return semesters.filter((semester) => semester.courses.length || semester.sgpa || semester.totalCredit);
}

export function validateResultPayload(input) {
  const payload = {
    college: cleanText(input?.college, 180),
    examRollNumber: normalizeIdentifier(input?.examRollNumber),
    enrollmentNumber: normalizeIdentifier(input?.enrollmentNumber),
    studentName: cleanText(input?.studentName, 120),
    email: normalizeEmail(input?.email),
    dateOfBirth: cleanText(input?.dateOfBirth, 10),
    programme: cleanText(input?.programme, 180),
    currentSemester: cleanText(input?.currentSemester, 40),
    fatherName: cleanText(input?.fatherName, 120),
    motherName: cleanText(input?.motherName, 120),
    examSession: cleanText(input?.examSession, 100),
    resultStatus: cleanText(input?.resultStatus, 50),
    cgpa: numericText(input?.cgpa, 10, "CGPA"),
    totalCredits: numericText(input?.totalCredits, 999, "Total credits"),
    resultDeclaredOn: cleanText(input?.resultDeclaredOn, 10),
    statementNumber: normalizeIdentifier(input?.statementNumber || input?.examRollNumber),
    remarks: cleanText(input?.remarks, 260),
    semesters: parseSemesters(input?.semesters),
  };

  const missing = [
    ["college or department", payload.college],
    ["exam roll number", payload.examRollNumber],
    ["enrollment number", payload.enrollmentNumber],
    ["student name", payload.studentName],
    ["email address", payload.email],
    ["date of birth", payload.dateOfBirth],
    ["programme", payload.programme],
    ["semester", payload.currentSemester],
    ["examination session", payload.examSession],
    ["result status", payload.resultStatus],
    ["result declaration date", payload.resultDeclaredOn],
  ].find(([, value]) => !value);

  if (missing) throw new Error(`Please provide the ${missing[0]}.`);
  if (!/^[A-Z0-9./-]{3,80}$/.test(payload.examRollNumber)) {
    throw new Error("Exam roll number contains unsupported characters.");
  }
  if (!/^[A-Z0-9./-]{3,80}$/.test(payload.enrollmentNumber)) {
    throw new Error("Enrollment number contains unsupported characters.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) throw new Error("Enter a valid email address.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.dateOfBirth)) throw new Error("Enter a valid date of birth.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.resultDeclaredOn)) {
    throw new Error("Enter a valid result declaration date.");
  }
  return payload;
}

export function publicLookupPayload(input) {
  return {
    college: cleanText(input?.college, 180),
    examRollNumber: normalizeIdentifier(input?.examRollNumber),
    studentName: cleanText(input?.studentName, 120),
    email: normalizeEmail(input?.email),
    dateOfBirth: cleanText(input?.dateOfBirth, 10),
  };
}

export function resultFromRow(row) {
  let semesters = [];
  try {
    semesters = JSON.parse(row.semesters_json || "[]");
  } catch {
    semesters = [];
  }

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
    fatherName: row.father_name,
    motherName: row.mother_name,
    examSession: row.exam_session,
    resultStatus: row.result_status,
    cgpa: row.cgpa,
    totalCredits: row.total_credits,
    resultDeclaredOn: row.result_declared_on,
    statementNumber: row.statement_no,
    remarks: row.remarks,
    semesters,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
