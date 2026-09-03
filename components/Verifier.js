"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { collegeOptions } from "@/lib/colleges";

const initialForm = {
  college: "",
  examRollNumber: "",
  studentName: "",
  email: "",
  day: "",
  month: "",
  year: "",
};

const days = Array.from({ length: 31 }, (_, index) => String(index + 1));
const months = Array.from({ length: 12 }, (_, index) => String(index + 1));
const years = Array.from({ length: 127 }, (_, index) => String(2026 - index));

function padded(value) {
  return String(value).padStart(2, "0");
}

export default function Verifier() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function field(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError("");
  }

  async function verify(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          college: form.college,
          examRollNumber: form.examRollNumber,
          studentName: form.studentName,
          email: form.email,
          dateOfBirth: `${form.year}-${padded(form.month)}-${padded(form.day)}`,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The request could not be completed.");
      setResult(data.result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setForm(initialForm);
    setResult(null);
    setError("");
  }

  return (
    <main className="du-page">
      <header className="du-header">
        <div className="du-logo-cell">
          <img
            src="https://durslt.du.ac.in/AC_INTERNET_Marksheet_NDB/Images/DU_Logo.JPG"
            alt="University of Delhi emblem"
          />
        </div>
        <div className="du-heading-cell">
          <h1>University of Delhi</h1>
          <p>Manual Results (Semester/Annual Examination)</p>
        </div>
      </header>

      <nav className="du-nav" aria-label="Portal navigation">
        <span className="du-nav-divider du-nav-first" />
        <a href="#result-form">Home</a>
        <span className="du-nav-divider" />
        <a href="#result-form">Statement of Marks</a>
        <span className="du-nav-divider" />
        <a href="#declared-results">List of Declared Result</a>
        <span className="du-nav-divider du-nav-last" />
      </nav>

      <section className="du-content" id="result-form">
        <h2>Semester/Annual Examination Results</h2>
        <h3>Statement of Marks/Score Card</h3>
        <div className="du-blue-line" />
        <p className="du-notice">
          Students are advised to save their Statement of Marks/Score Card for future purpose.<br />
          This link will not be available later.
        </p>
        <div className="du-blue-line" />

        {!result ? (
          <>
            <form className="du-form" onSubmit={verify}>
              <label htmlFor="college">College/Department Name <b>*</b></label>
              <select id="college" name="college" value={form.college} onChange={field} required>
                <option value="">&lt;-----Select-----&gt;</option>
                {collegeOptions.map((college) => (
                  <option key={college.code} value={college.name}>{college.name}</option>
                ))}
              </select>

              <label htmlFor="exam-roll">Exam Roll No. <b>*</b></label>
              <input id="exam-roll" name="examRollNumber" maxLength={15} value={form.examRollNumber} onChange={field} required />

              <label htmlFor="student-name">Student Name <b>*</b></label>
              <input id="student-name" name="studentName" maxLength={50} value={form.studentName} onChange={field} required />

              <label htmlFor="email">Email Id (As per Exam Form) <b>*</b></label>
              <input id="email" name="email" maxLength={50} value={form.email} onChange={field} required />

              <label>Date of Birth <b>*</b></label>
              <div className="du-date-fields">
                <label htmlFor="birth-day">DD</label>
                <select id="birth-day" name="day" value={form.day} onChange={field} required>
                  <option value="">DD</option>
                  {days.map((day) => <option key={day}>{day}</option>)}
                </select>
                <label htmlFor="birth-month">MM</label>
                <select id="birth-month" name="month" value={form.month} onChange={field} required>
                  <option value="">MM</option>
                  {months.map((month) => <option key={month}>{month}</option>)}
                </select>
                <label htmlFor="birth-year">YYYY</label>
                <select id="birth-year" name="year" value={form.year} onChange={field} required>
                  <option value="">YYYY</option>
                  {years.map((year) => <option key={year}>{year}</option>)}
                </select>
              </div>

              {error && <p className="du-error" role="alert">{error}</p>}
              <div className="du-form-actions">
                <button type="submit" disabled={loading}>{loading ? "Please wait…" : "Search Details"}</button>
              </div>
            </form>

            <div className="du-information" id="declared-results">
              <p className="mandatory-note"><b>*</b> : Mandatory Fields</p>
              <p><strong>Note 1 :</strong> <b>For any query related to results, students are advised to contact window no.7 of examination branch North Campus on any working day between 9.00am to 3.30pm.</b></p>
              <p><strong>Note 2 :</strong> <b>In case of any discrepancy in the email ID, date of birth, or other basic details, students may contact the marksheet section of the examination branch.</b></p>
              <div className="du-lower-line" />
              <button className="du-focus-button" type="button" tabIndex={-1} aria-hidden="true" />
            </div>
          </>
        ) : (
          <section className="result-view">
            <div className="result-summary">
              <strong>{result.studentName}</strong>
              <span>{result.college} &middot; Exam Roll {result.examRollNumber}{result.examSession ? ` · ${result.examSession}` : ""}</span>
            </div>
            <div className="result-actions">
              <a className="du-download" href={`${result.pdfUrl}&download=1`}>Download PDF</a>
              <button type="button" onClick={reset}>Search another result</button>
            </div>
            <div className="pdf-stage">
              <iframe title={`Score card for ${result.studentName}`} src={result.pdfUrl} />
              <p className="pdf-fallback">Cannot see the score card? <a href={result.pdfUrl} target="_blank" rel="noreferrer">Open the PDF in a new tab</a>.</p>
            </div>
          </section>
        )}
      </section>

      <footer className="du-footer">
        <p>University of Delhi (Compatible Browser: mozilla firefox)</p>
        <p>(For any query related to results, students are advised to contact window no.7 of examination branch North Campus on any working day between 9.00am to 3.30pm.)</p>
        <div />
      </footer>
    </main>
  );
}
