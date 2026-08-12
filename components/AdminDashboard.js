"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const emptyResult = {
  college: "",
  examRollNumber: "",
  enrollmentNumber: "",
  studentName: "",
  email: "",
  dateOfBirth: "",
  programme: "",
  currentSemester: "",
  fatherName: "",
  motherName: "",
  examSession: "",
  resultStatus: "Pass",
  cgpa: "",
  totalCredits: "",
  resultDeclaredOn: "",
  statementNumber: "",
  remarks: "",
  semesters: [],
};

function emptySemester(number) {
  return { label: String(number), totalCredit: "", totalCreditPoint: "", sgpa: "", result: "", cgpa: "", courses: [] };
}

function emptyCourse() {
  return { paperCode: "", appearingStatus: "", paperName: "", paperType: "", credits: "", grade: "", gradePoint: "", creditPoint: "" };
}

async function api(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "The request could not be completed.");
  return data;
}

function Login({ onAuthenticated }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      onAuthenticated();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login">
      <section className="admin-login-brand">
        <Link href="/">← Public result search</Link>
        <div>
          <img src="/assets/portal-mark.svg" alt="" />
          <span>INDEPENDENT DEMO PORTAL</span>
          <h1>Delhi result records administration.</h1>
          <p>Create the candidate, semester, paper, credit, and grade data used to render the two-page HTML marks statement.</p>
        </div>
      </section>
      <section className="admin-login-form">
        <form onSubmit={submit}>
          <span className="admin-kicker">RESTRICTED ACCESS</span>
          <h2>Admin sign in</h2>
          <p>Enter the PIN configured in the deployment environment.</p>
          <label htmlFor="admin-pin">Admin PIN</label>
          <input id="admin-pin" type="password" inputMode="numeric" value={pin} onChange={(event) => setPin(event.target.value)} autoFocus required />
          {error && <p className="admin-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
        </form>
      </section>
    </main>
  );
}

function TextField({ label, name, form, onChange, type = "text", required = false, full = false, ...props }) {
  return (
    <label className={full ? "full-field" : ""}>
      <span>{label}{required ? " *" : ""}</span>
      <input name={name} type={type} value={form[name]} onChange={onChange} required={required} {...props} />
    </label>
  );
}

function Editor({ record, onClose, onSaved }) {
  const [form, setForm] = useState(() => record ? structuredClone(record) : structuredClone(emptyResult));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function field(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError("");
  }

  function updateSemester(index, key, value) {
    setForm((current) => ({
      ...current,
      semesters: current.semesters.map((semester, semesterIndex) => semesterIndex === index ? { ...semester, [key]: value } : semester),
    }));
  }

  function addSemester() {
    setForm((current) => ({ ...current, semesters: [...current.semesters, emptySemester(current.semesters.length + 1)] }));
  }

  function addCourse(semesterIndex) {
    setForm((current) => ({
      ...current,
      semesters: current.semesters.map((semester, index) => index === semesterIndex ? { ...semester, courses: [...semester.courses, emptyCourse()] } : semester),
    }));
  }

  function updateCourse(semesterIndex, courseIndex, key, value) {
    setForm((current) => ({
      ...current,
      semesters: current.semesters.map((semester, index) => index === semesterIndex ? {
        ...semester,
        courses: semester.courses.map((course, indexOfCourse) => indexOfCourse === courseIndex ? { ...course, [key]: value } : course),
      } : semester),
    }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = new FormData();
      const payload = { ...form };
      ["id", "createdAt", "updatedAt"].forEach((key) => delete payload[key]);
      body.set("payload", JSON.stringify(payload));
      const data = await api(record ? `/api/admin/results/${record.id}` : "/api/admin/results", {
        method: record ? "PUT" : "POST",
        body,
      });
      onSaved(data.result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="editor-overlay">
      <button className="editor-backdrop" type="button" onClick={onClose} aria-label="Close editor" />
      <section className="result-editor" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <header>
          <div><span className="admin-kicker">STRUCTURED SCORE CARD</span><h2 id="editor-title">{record ? "Edit result" : "Add result"}</h2></div>
          <button className="editor-close" type="button" onClick={onClose}>×</button>
        </header>
        <form onSubmit={save}>
          <fieldset>
            <legend><b>01</b> Public lookup fields</legend>
            <div className="editor-grid">
              <TextField label="College/department" name="college" form={form} onChange={field} required full />
              <TextField label="Exam roll number" name="examRollNumber" form={form} onChange={field} required />
              <TextField label="Student name" name="studentName" form={form} onChange={field} required />
              <TextField label="Email as per exam form" name="email" form={form} onChange={field} type="email" required />
              <TextField label="Date of birth" name="dateOfBirth" form={form} onChange={field} type="date" required />
            </div>
          </fieldset>

          <fieldset>
            <legend><b>02</b> Candidate and programme</legend>
            <div className="editor-grid">
              <TextField label="Enrollment number" name="enrollmentNumber" form={form} onChange={field} required />
              <TextField label="Statement number" name="statementNumber" form={form} onChange={field} />
              <TextField label="Programme" name="programme" form={form} onChange={field} required full />
              <TextField label="Semester shown in header" name="currentSemester" form={form} onChange={field} required placeholder="e.g. VI" />
              <TextField label="Father's name" name="fatherName" form={form} onChange={field} />
              <TextField label="Mother's name" name="motherName" form={form} onChange={field} />
            </div>
          </fieldset>

          <fieldset>
            <legend><b>03</b> Overall result</legend>
            <div className="editor-grid">
              <TextField label="Examination session" name="examSession" form={form} onChange={field} required placeholder="e.g. Semester Examination May-June 2026" />
              <label><span>Result status *</span><select name="resultStatus" value={form.resultStatus} onChange={field}><option>Pass</option><option>First Division</option><option>Second Division</option><option>ER</option><option>Result Awaited</option><option>Fail</option></select></label>
              <TextField label="CGPA" name="cgpa" form={form} onChange={field} type="number" min="0" max="10" step="0.01" />
              <TextField label="Total credits" name="totalCredits" form={form} onChange={field} type="number" min="0" max="999" step="0.5" />
              <TextField label="Result declared on" name="resultDeclaredOn" form={form} onChange={field} type="date" required />
              <TextField label="Remarks" name="remarks" form={form} onChange={field} full />
            </div>
          </fieldset>

          <fieldset>
            <div className="fieldset-title"><legend><b>04</b> Semesters and papers</legend><button type="button" onClick={addSemester}>+ Add semester</button></div>
            {!form.semesters.length && <div className="no-semesters"><p>No semesters added. Add one, then enter every paper as plain text.</p><button type="button" onClick={addSemester}>Add first semester</button></div>}
            {form.semesters.map((semester, semesterIndex) => (
              <section className="semester-editor" key={semesterIndex}>
                <header>
                  <div className="semester-editor-meta">
                    <label><span>Semester (e.g. I)</span><input value={semester.label} onChange={(event) => updateSemester(semesterIndex, "label", event.target.value)} /></label>
                    <label><span>Total credit</span><input value={semester.totalCredit} onChange={(event) => updateSemester(semesterIndex, "totalCredit", event.target.value)} /></label>
                    <label><span>Total credit point</span><input value={semester.totalCreditPoint} onChange={(event) => updateSemester(semesterIndex, "totalCreditPoint", event.target.value)} /></label>
                    <label><span>SGPA</span><input value={semester.sgpa} onChange={(event) => updateSemester(semesterIndex, "sgpa", event.target.value)} /></label>
                    <label><span>Result</span><input value={semester.result} onChange={(event) => updateSemester(semesterIndex, "result", event.target.value)} /></label>
                    <label><span>CGPA</span><input value={semester.cgpa} onChange={(event) => updateSemester(semesterIndex, "cgpa", event.target.value)} /></label>
                  </div>
                  <button type="button" onClick={() => setForm((current) => ({ ...current, semesters: current.semesters.filter((_, index) => index !== semesterIndex) }))} aria-label="Remove semester">×</button>
                </header>
                <div className="paper-heading"><strong>Paper rows</strong><button type="button" onClick={() => addCourse(semesterIndex)}>+ Add paper</button></div>
                {semester.courses.map((course, courseIndex) => (
                  <div className="paper-row" key={courseIndex}>
                    <span>{courseIndex + 1}</span>
                    {[
                      ["paperCode", "Paper code"], ["appearingStatus", "Appearing status"], ["paperName", "Paper name"], ["paperType", "Paper type"],
                      ["credits", "Credits"], ["grade", "Grade"], ["gradePoint", "Grade point"], ["creditPoint", "Credit point"],
                    ].map(([key, placeholder]) => <input key={key} placeholder={placeholder} value={course[key]} onChange={(event) => updateCourse(semesterIndex, courseIndex, key, event.target.value)} />)}
                    <button type="button" onClick={() => setForm((current) => ({ ...current, semesters: current.semesters.map((item, index) => index === semesterIndex ? { ...item, courses: item.courses.filter((_, indexOfCourse) => indexOfCourse !== courseIndex) } : item) }))} aria-label="Remove paper">×</button>
                  </div>
                ))}
              </section>
            ))}
          </fieldset>

          {error && <p className="editor-error" role="alert">{error}</p>}
          <footer><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving…" : record ? "Save changes" : "Publish result"}</button></footer>
        </form>
      </section>
    </div>
  );
}

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(null);
  const [results, setResults] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [editor, setEditor] = useState(undefined);
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [message, setMessage] = useState("");
  const semesterCount = useMemo(() => results.reduce((sum, result) => sum + result.semesters.length, 0), [results]);

  async function loadResults(query = "") {
    setLoading(true);
    try {
      const data = await api(`/api/admin/results${query ? `?query=${encodeURIComponent(query)}` : ""}`);
      setResults(data.results);
    } catch (requestError) {
      if (requestError.message.includes("authentication")) setAuthenticated(false);
      else setMessage(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api("/api/admin/session").then(() => { setAuthenticated(true); loadResults(); }).catch(() => setAuthenticated(false));
  }, []);

  useEffect(() => {
    if (!authenticated) return undefined;
    const timer = setTimeout(() => loadResults(search.trim()), 280);
    return () => clearTimeout(timer);
  }, [search, authenticated]);

  async function removeRecord() {
    if (!deleteRecord) return;
    try {
      await api(`/api/admin/results/${deleteRecord.id}`, { method: "DELETE" });
      setDeleteRecord(null);
      setMessage("Result removed.");
      await loadResults(search.trim());
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  if (authenticated === null) return <main className="admin-loading">Loading administration…</main>;
  if (!authenticated) return <Login onAuthenticated={() => { setAuthenticated(true); loadResults(); }} />;

  return (
    <main className="admin-dashboard">
      <aside className="admin-sidebar">
        <Link href="/"><img src="/assets/portal-mark.svg" alt="" /><b>DU RESULTS<br />DEMO ADMIN</b></Link>
        <nav><button className="active" type="button">Result records <em>{results.length}</em></button><Link href="/" target="_blank">Public search ↗</Link></nav>
        <button type="button" onClick={async () => { await fetch("/api/admin/logout", { method: "POST" }); setAuthenticated(false); }}>Sign out</button>
      </aside>
      <section className="admin-content">
        <header className="admin-page-header"><div><span className="admin-kicker">DEMO RECORDS MANAGEMENT</span><h1>Exam results</h1></div><button className="primary-button" type="button" onClick={() => setEditor(null)}>+ Add result</button></header>
        <section className="admin-metrics">
          <article><span>Total records</span><strong>{results.length}</strong><p>Stored in delhi_uni_results</p></article>
          <article><span>Semester summaries</span><strong>{semesterCount}</strong><p>Across all result records</p></article>
          <article><span>Last updated</span><strong>{results[0]?.updatedAt ? new Date(results[0].updatedAt).toLocaleDateString("en-IN") : "—"}</strong><p>Most recent record change</p></article>
        </section>
        <section className="admin-records">
          <header><div><h2>All result records</h2><p>Plain fields render into HTML and on-demand demo PDFs.</p></div><input type="search" placeholder="Search name, roll, enrollment or college…" value={search} onChange={(event) => setSearch(event.target.value)} /></header>
          {message && <p className="admin-message">{message}</p>}
          {loading ? <div className="records-empty">Loading records…</div> : !results.length ? (
            <div className="records-empty"><strong>No Delhi demo results yet</strong><p>Create the first structured score-card record.</p><button className="primary-button" type="button" onClick={() => setEditor(null)}>Add first result</button></div>
          ) : (
            <div className="records-table-wrap"><table><thead><tr><th>Candidate</th><th>Exam roll</th><th>College</th><th>Session</th><th>Semesters</th><th /></tr></thead><tbody>{results.map((record) => (
              <tr key={record.id}><td><strong>{record.studentName}</strong><small>{record.programme}</small></td><td className="mono">{record.examRollNumber}</td><td>{record.college}</td><td>{record.examSession}</td><td>{record.semesters.length}</td><td><div className="record-actions"><button type="button" onClick={() => setEditor(record)}>Edit</button><button type="button" onClick={() => setDeleteRecord(record)}>Delete</button></div></td></tr>
            ))}</tbody></table></div>
          )}
        </section>
      </section>

      {editor !== undefined && <Editor record={editor} onClose={() => setEditor(undefined)} onSaved={async () => { setEditor(undefined); setMessage(editor ? "Result updated." : "Result published."); await loadResults(search.trim()); }} />}
      {deleteRecord && <div className="confirm-overlay"><section><h2>Remove this result?</h2><p>The structured marks statement will be permanently deleted.</p><div><button className="secondary-button" type="button" onClick={() => setDeleteRecord(null)}>Keep record</button><button className="danger-button" type="button" onClick={removeRecord}>Remove result</button></div></section></div>}
    </main>
  );
}
