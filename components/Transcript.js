"use client";

/* eslint-disable @next/next/no-img-element */

function displayDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function Detail({ label, value }) {
  return <div className="score-detail"><strong>{label}</strong><span>:</span><b>{value || "—"}</b></div>;
}

function semesterLabel(value) {
  return String(value || "—").replace(/^semester\s*/i, "") || "—";
}

export default function Transcript({ result, documentRef }) {
  const paperRows = result.semesters.flatMap((semester) =>
    semester.courses.map((course) => ({ ...course, semester: semesterLabel(semester.label) })),
  );

  return (
    <article ref={documentRef} className="score-card">
      <header className="score-letterhead">
        <img src="/assets/portal-mark.svg" alt="" />
        <div>
          <h1>University of Delhi</h1>
          <p>{result.examSession}</p>
        </div>
      </header>
      <h2 className="score-title">Statement of Marks/Grades</h2>
      <p className="score-independent-note">Independent record · Not issued or endorsed by the University of Delhi</p>

      <section className="score-profile">
        <Detail label="Exam Roll No." value={result.examRollNumber} />
        <Detail label="Name" value={result.studentName} />
        <Detail label="Father Name" value={result.fatherName} />
        <Detail label="Mother Name" value={result.motherName} />
        <Detail label="Enrollment No." value={result.enrollmentNumber} />
        <Detail label="Course Name" value={result.programme} />
        <Detail label="Semester" value={result.currentSemester} />
        <Detail label="College Name" value={result.college} />
      </section>

      <table className="papers-table">
        <thead><tr><th>Sr.<br />No.</th><th>Paper Code</th><th>Appearing<br />Status</th><th>Paper Name</th><th>Paper<br />Type</th><th>Sem</th><th>Credit</th><th>Grade<br />Letter</th><th>Grade<br />Point</th><th>Credit<br />Point</th></tr></thead>
        <tbody>{paperRows.length ? paperRows.map((course, index) => (
          <tr key={`${course.paperCode}-${index}`}>
            <td>{index + 1}</td><td>{course.paperCode || "—"}</td><td>{course.appearingStatus || ""}</td><td>{course.paperName || "—"}</td><td>{course.paperType || "—"}</td><td>{course.semester}</td><td>{course.credits || "—"}</td><td>{course.grade || "—"}</td><td>{course.gradePoint || "—"}</td><td>{course.creditPoint || "—"}</td>
          </tr>
        )) : <tr><td colSpan="10">No paper rows were entered for this record.</td></tr>}</tbody>
      </table>

      <table className="semester-summary-table">
        <thead><tr><th>Sem</th><th>Total Credit</th><th>Total Credit Point</th><th>SGPA</th><th>Result</th><th>CGPA</th></tr></thead>
        <tbody>{result.semesters.map((semester, index) => (
          <tr key={`${semester.label}-${index}`}><td>{semesterLabel(semester.label)}</td><td>{semester.totalCredit || "—"}</td><td>{semester.totalCreditPoint || "—"}</td><td>{semester.sgpa || "—"}</td><td>{semester.result || ""}</td><td>{semester.cgpa || ""}</td></tr>
        ))}</tbody>
      </table>

      <p className="grand-result">Grand CGPA: {result.cgpa || "—"}, Division: {result.resultStatus || "—"}</p>
      {result.remarks && <p className="score-remarks"><strong>Remarks:</strong> {result.remarks}</p>}
      <section className="score-notes">
        <p><strong>Abbreviations:</strong> O: Outstanding; A+: Excellent; A: Very Good; B+: Good; B: Above Average; C: Average; D: Pass; F: Fail; AB: Absent; NA: Not Available; *: Old Awards; RA: Result Awaited.</p>
        <p><strong>Note:</strong> This web-based Statement of Marks/Grades is valid for any official purpose.</p>
        <p>A grade of F or AB indicates that the paper must be reattempted according to the applicable examination cycle.</p>
        <p>Final percentage calculations, if required, must follow the rules applicable to the actual programme and examination scheme.</p>
      </section>
      <section className="declaration-row">
        <span>Date of Result Declaration: {displayDate(result.resultDeclaredOn)}</span>
        <b>Statement No.: {result.statementNumber || result.examRollNumber}</b>
      </section>
      <section className="score-disclaimer">
        <strong>Disclaimer:</strong>
        <p>This record was created in an independent system and is subject to administrator correction.</p>
        <p>It is not connected to the University of Delhi and must not be used as evidence of academic qualification.</p>
      </section>
      <footer className="score-footer">COMPUTER-GENERATED RECORD · NO SIGNATURE OR SEAL</footer>
    </article>
  );
}
