"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import Transcript from "./Transcript";

const colleges = [
  "Acharya Narendra Dev College",
  "Atma Ram Sanatan Dharma College",
  "Daulat Ram College",
  "Delhi College of Arts and Commerce",
  "Gargi College",
  "Hansraj College",
  "Hindu College",
  "Kirori Mal College",
  "Miranda House",
  "Ramjas College",
  "Shri Ram College of Commerce",
  "Sri Venkateswara College",
  "St. Stephen's College",
  "Zakir Husain Delhi College",
];

const initialForm = { college: "", examRollNumber: "", studentName: "", email: "", dateOfBirth: "" };

function captchaValue() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default function Verifier() {
  const [form, setForm] = useState(initialForm);
  const [captcha, setCaptcha] = useState("688968");
  const [captchaInput, setCaptchaInput] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const transcriptRef = useRef(null);

  function field(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError("");
  }

  async function verify(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    if (captchaInput !== captcha) {
      setError("The security code does not match. Please try again.");
      setCaptcha(captchaValue());
      setCaptchaInput("");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
    setCaptchaInput("");
    setCaptcha(captchaValue());
    setResult(null);
    setError("");
  }

  async function downloadPdf() {
    if (!transcriptRef.current || !result) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const canvas = await html2canvas(transcriptRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const pageWidth = 210;
      const pageHeight = 297;
      const imageHeight = (canvas.height * pageWidth) / canvas.width;
      const pages = Math.ceil((imageHeight - 0.5) / pageHeight);
      const image = canvas.toDataURL("image/jpeg", 0.94);
      for (let page = 0; page < pages; page += 1) {
        if (page) pdf.addPage();
        pdf.addImage(image, "JPEG", 0, -(page * pageHeight), pageWidth, imageHeight, undefined, "FAST");
      }
      pdf.save(`${result.examRollNumber}-score-card.pdf`);
    } catch {
      setError("The PDF could not be generated. Use your browser's Print option instead.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="du-page">
      <header className="du-header">
        <img src="https://durslt.du.ac.in/AC_INTERNET_Marksheet_NDB/Images/DU_Logo.JPG" alt="University of Delhi emblem" />
        <div>
          <h1>University of Delhi</h1>
          <p>(Examination Branch - PhD Thesis Evaluation System)</p>
        </div>
      </header>
      <nav className="du-nav" aria-label="Portal navigation">
        <a href="#result-form">Home</a><i />
        <a href="#result-form">Statement of Marks</a><i />
        <span>List of Declared Result</span>
      </nav>

      <section className="du-content" id="result-form">
        <h2>Semester/Annual Examination Results</h2>
        <h3>Statement of Marks/Score Card</h3>
        <div className="du-blue-line" />
        <p className="du-notice">Students are advised to save their Statement of Marks/Score Card for future purpose.<br />This result link may not be available later.</p>
        <div className="du-blue-line" />

        {!result ? (
          <form className="du-form" onSubmit={verify}>
            <label htmlFor="college">College/Department Name <b>*</b></label>
            <input id="college" name="college" list="college-list" value={form.college} onChange={field} required />
            <datalist id="college-list">{colleges.map((college) => <option key={college} value={college} />)}</datalist>

            <label htmlFor="exam-roll">Exam Roll No. <b>*</b></label>
            <input id="exam-roll" name="examRollNumber" value={form.examRollNumber} onChange={field} required />

            <label htmlFor="student-name">Student Name <b>*</b></label>
            <input id="student-name" name="studentName" value={form.studentName} onChange={field} required />

            <label htmlFor="email">Email Id (As per Exam Form) <b>*</b></label>
            <input id="email" name="email" type="email" value={form.email} onChange={field} required />

            <label htmlFor="dob">Date of Birth <b>*</b></label>
            <input id="dob" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={field} required />

            <label htmlFor="captcha">Security Code <b>*</b></label>
            <div className="du-captcha-field">
              <strong aria-label={`Security code ${captcha}`}>{captcha}</strong>
              <button type="button" onClick={() => { setCaptcha(captchaValue()); setCaptchaInput(""); }}>Refresh</button>
              <input id="captcha" inputMode="numeric" value={captchaInput} onChange={(event) => setCaptchaInput(event.target.value)} required />
            </div>

            {error && <p className="du-error" role="alert">{error}</p>}
            <div className="du-form-actions">
              <button type="submit" disabled={loading}>{loading ? "Please wait…" : "Print Score Card"}</button>
              <button type="button" onClick={reset}>Reset</button>
            </div>
          </form>
        ) : (
          <section className="result-view">
            <div className="result-actions">
              <button type="button" onClick={downloadPdf} disabled={downloading}>{downloading ? "Generating PDF…" : "Download PDF"}</button>
              <button type="button" onClick={reset}>Search another result</button>
            </div>
            {error && <p className="du-error" role="alert">{error}</p>}
            <div className="score-card-scroll"><Transcript result={result} documentRef={transcriptRef} /></div>
          </section>
        )}

        {!result && <p className="mandatory-note">* : Mandatory Fields</p>}
      </section>

      <footer className="du-footer">
        Delhi University Results Portal
      </footer>
    </main>
  );
}
