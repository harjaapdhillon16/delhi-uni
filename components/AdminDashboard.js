"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collegeOptions } from "@/lib/colleges";

const emptyResult = {
  college: "",
  examRollNumber: "",
  studentName: "",
  email: "",
  dateOfBirth: "",
  enrollmentNumber: "",
  programme: "",
  currentSemester: "",
  examSession: "",
  resultDeclaredOn: "",
};

async function api(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "The request could not be completed.");
  return data;
}

function readableSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
          <span>INDEPENDENT RESULTS PORTAL</span>
          <h1>Delhi result records administration.</h1>
          <p>Enter the candidate details used by the public search and upload the score-card PDF shown for them.</p>
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
      <input name={name} type={type} value={form[name] ?? ""} onChange={onChange} required={required} {...props} />
    </label>
  );
}

function Editor({ record, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    ...emptyResult,
    ...(record
      ? {
          college: record.college,
          examRollNumber: record.examRollNumber,
          studentName: record.studentName,
          email: record.email,
          dateOfBirth: record.dateOfBirth,
          enrollmentNumber: record.enrollmentNumber || "",
          programme: record.programme || "",
          currentSemester: record.currentSemester || "",
          examSession: record.examSession || "",
          resultDeclaredOn: record.resultDeclaredOn || "",
        }
      : {}),
  }));
  const [pdf, setPdf] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function field(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError("");
  }

  async function save(event) {
    event.preventDefault();
    if (!record && !pdf) {
      setError("Upload the score-card PDF for this record.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = new FormData();
      body.set("payload", JSON.stringify(form));
      if (pdf) body.set("resultPdf", pdf);
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
          <div><span className="admin-kicker">PDF SCORE CARD</span><h2 id="editor-title">{record ? "Edit result" : "Add result"}</h2></div>
          <button className="editor-close" type="button" onClick={onClose}>×</button>
        </header>
        <form onSubmit={save}>
          <fieldset>
            <legend><b>01</b> Public lookup fields</legend>
            <p className="fieldset-note">
              A candidate is shown this PDF only when all five values match exactly what is entered here.
            </p>
            <div className="editor-grid">
              <label className="full-field">
                <span>College/department *</span>
                <select name="college" value={form.college} onChange={field} required>
                  <option value="">Select a college or department</option>
                  {record?.college && !collegeOptions.some((college) => college.name === record.college) && (
                    <option value={record.college}>{record.college}</option>
                  )}
                  {collegeOptions.map((college) => (
                    <option key={college.code} value={college.name}>{college.name}</option>
                  ))}
                </select>
              </label>
              <TextField label="Exam roll number" name="examRollNumber" form={form} onChange={field} required />
              <TextField label="Student name" name="studentName" form={form} onChange={field} required />
              <TextField label="Email as per exam form" name="email" form={form} onChange={field} type="email" required />
              <TextField label="Date of birth" name="dateOfBirth" form={form} onChange={field} type="date" required />
            </div>
          </fieldset>

          <fieldset>
            <legend><b>02</b> Score-card PDF</legend>
            <p className="fieldset-note">
              The uploaded file is stored in Supabase storage; only a reference is kept in MySQL.
            </p>
            <label className="photo-input full-field">
              <span>{record ? "Replace PDF (optional)" : "Score-card PDF *"}</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => { setPdf(event.target.files?.[0] || null); setError(""); }}
              />
              {record?.pdfFilename && (
                <small>
                  Current file: <b>{record.pdfFilename}</b> ({readableSize(record.pdfSizeBytes)}){" "}
                  <a href={record.pdfUrl} target="_blank" rel="noreferrer">Open ↗</a>
                </small>
              )}
              {pdf && <small>Selected: {pdf.name} ({readableSize(pdf.size)})</small>}
            </label>
          </fieldset>

          <fieldset>
            <legend><b>03</b> Reference details</legend>
            <p className="fieldset-note">Used to label the record in this dashboard and above the PDF viewer.</p>
            <div className="editor-grid">
              <TextField label="Enrollment number" name="enrollmentNumber" form={form} onChange={field} />
              <TextField label="Semester" name="currentSemester" form={form} onChange={field} placeholder="e.g. VI" />
              <TextField label="Programme" name="programme" form={form} onChange={field} full />
              <TextField label="Examination session" name="examSession" form={form} onChange={field} placeholder="e.g. Semester Examination May-June 2026" />
              <TextField label="Result declared on" name="resultDeclaredOn" form={form} onChange={field} type="date" />
            </div>
          </fieldset>

          {error && <p className="editor-error" role="alert">{error}</p>}
          <footer>
            <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
            <button className="primary-button" type="submit" disabled={saving}>{saving ? "Uploading result…" : record ? "Save changes" : "Publish result"}</button>
          </footer>
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

  const storedBytes = useMemo(
    () => results.reduce((total, result) => total + (result.pdfSizeBytes || 0), 0),
    [results],
  );

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
        <Link href="/"><img src="/assets/portal-mark.svg" alt="" /><b>DU RESULTS<br />ADMIN</b></Link>
        <nav><button className="active" type="button">Result records <em>{results.length}</em></button><Link href="/" target="_blank">Public search ↗</Link></nav>
        <button type="button" onClick={async () => { await fetch("/api/admin/logout", { method: "POST" }); setAuthenticated(false); }}>Sign out</button>
      </aside>
      <section className="admin-content">
        <header className="admin-page-header"><div><span className="admin-kicker">RECORDS MANAGEMENT</span><h1>Exam results</h1></div><button className="primary-button" type="button" onClick={() => setEditor(null)}>+ Add result</button></header>
        <section className="admin-metrics">
          <article><span>Total records</span><strong>{results.length}</strong><p>Stored in delhi_uni_result_documents</p></article>
          <article><span>Stored PDFs</span><strong>{readableSize(storedBytes)}</strong><p>Held in Supabase storage</p></article>
          <article><span>Last updated</span><strong>{results[0]?.updatedAt ? new Date(results[0].updatedAt).toLocaleDateString("en-IN") : "—"}</strong><p>Most recent record change</p></article>
        </section>
        <section className="admin-records">
          <header><div><h2>All result records</h2><p>Each record maps the five lookup fields to one uploaded PDF.</p></div><input type="search" placeholder="Search name, roll, enrollment or college…" value={search} onChange={(event) => setSearch(event.target.value)} /></header>
          {message && <p className="admin-message">{message}</p>}
          {loading ? <div className="records-empty">Loading records…</div> : !results.length ? (
            <div className="records-empty"><strong>No Delhi results yet</strong><p>Add the candidate lookup details and upload their score-card PDF.</p><button className="primary-button" type="button" onClick={() => setEditor(null)}>Add first result</button></div>
          ) : (
            <div className="records-table-wrap"><table><thead><tr><th>Candidate</th><th>Exam roll</th><th>College</th><th>Session</th><th>PDF</th><th /></tr></thead><tbody>{results.map((record) => (
              <tr key={record.id}>
                <td><strong>{record.studentName}</strong><small>{record.email}</small></td>
                <td className="mono">{record.examRollNumber}</td>
                <td>{record.college}</td>
                <td>{record.examSession || "—"}</td>
                <td><a href={record.pdfUrl} target="_blank" rel="noreferrer">View ↗</a><small>{readableSize(record.pdfSizeBytes)}</small></td>
                <td><div className="record-actions"><button type="button" onClick={() => setEditor(record)}>Edit</button><button type="button" onClick={() => setDeleteRecord(record)}>Delete</button></div></td>
              </tr>
            ))}</tbody></table></div>
          )}
        </section>
      </section>

      {editor !== undefined && <Editor record={editor} onClose={() => setEditor(undefined)} onSaved={async () => { setEditor(undefined); setMessage(editor ? "Result updated." : "Result published."); await loadResults(search.trim()); }} />}
      {deleteRecord && <div className="confirm-overlay"><section><h2>Remove this result?</h2><p>The record and its uploaded PDF will be permanently deleted.</p><div><button className="secondary-button" type="button" onClick={() => setDeleteRecord(null)}>Keep record</button><button className="danger-button" type="button" onClick={removeRecord}>Remove result</button></div></section></div>}
    </main>
  );
}
