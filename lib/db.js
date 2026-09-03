import mysql from "mysql2/promise";

const globalDatabase = globalThis;

const resultColumns = `
  id, college, exam_roll_no, enrollment_no, student_name, email, date_of_birth,
  programme, current_semester, exam_session, result_declared_on,
  pdf_object_key, pdf_filename, pdf_size_bytes, created_at, updated_at
`;

function configuration() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");
  const parsed = new URL(databaseUrl);
  const configuredCa = process.env.MYSQL_CA?.replace(/\\n/g, "\n");
  const requireOnly = parsed.searchParams.get("ssl-mode")?.toUpperCase() === "REQUIRED";

  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    ssl: configuredCa ? { ca: configuredCa, rejectUnauthorized: true } : { rejectUnauthorized: !requireOnly },
    waitForConnections: true,
    connectionLimit: 4,
    maxIdle: 2,
    idleTimeout: 60_000,
    queueLimit: 0,
    dateStrings: true,
    charset: "utf8mb4",
  };
}

export function getPool() {
  if (!globalDatabase.__delhiUniversityPool) {
    globalDatabase.__delhiUniversityPool = mysql.createPool(configuration());
  }
  return globalDatabase.__delhiUniversityPool;
}

export async function ensureSchema() {
  if (!globalDatabase.__delhiUniversitySchema) {
    globalDatabase.__delhiUniversitySchema = (async () => {
      const pool = getPool();
      // The row holds the landing-page identifiers plus a reference to the PDF in Supabase storage.
      await pool.query(`
        CREATE TABLE IF NOT EXISTS delhi_uni_result_documents (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          college VARCHAR(180) NOT NULL,
          exam_roll_no VARCHAR(80) NOT NULL,
          enrollment_no VARCHAR(80) NOT NULL DEFAULT '',
          student_name VARCHAR(120) NOT NULL,
          email VARCHAR(160) NOT NULL,
          date_of_birth VARCHAR(10) NOT NULL,
          programme VARCHAR(180) NOT NULL DEFAULT '',
          current_semester VARCHAR(40) NOT NULL DEFAULT '',
          exam_session VARCHAR(100) NOT NULL DEFAULT '',
          result_declared_on VARCHAR(10) NOT NULL DEFAULT '',
          pdf_object_key VARCHAR(320) NOT NULL,
          pdf_filename VARCHAR(200) NOT NULL DEFAULT 'score-card.pdf',
          pdf_size_bytes INT UNSIGNED NOT NULL DEFAULT 0,
          created_at VARCHAR(30) NOT NULL,
          updated_at VARCHAR(30) NOT NULL,
          PRIMARY KEY (id),
          UNIQUE KEY uq_delhi_uni_document_lookup (college, exam_roll_no, email, date_of_birth),
          KEY idx_delhi_uni_document_roll (exam_roll_no),
          KEY idx_delhi_uni_document_enrollment (enrollment_no),
          KEY idx_delhi_uni_document_student (student_name),
          KEY idx_delhi_uni_document_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS delhi_uni_audit_log (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          action VARCHAR(40) NOT NULL,
          result_id BIGINT UNSIGNED NULL,
          ip_address VARCHAR(80) NULL,
          created_at VARCHAR(30) NOT NULL,
          PRIMARY KEY (id),
          KEY idx_delhi_uni_audit_result (result_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    })().catch((error) => {
      globalDatabase.__delhiUniversitySchema = null;
      throw error;
    });
  }
  return globalDatabase.__delhiUniversitySchema;
}

export async function databaseHealth() {
  await ensureSchema();
  await getPool().query("SELECT 1");
}

export async function findPublicResult({ college, examRollNumber, studentName, email, dateOfBirth }) {
  await ensureSchema();
  const [rows] = await getPool().execute(
    `SELECT ${resultColumns} FROM delhi_uni_result_documents
     WHERE college = ? AND exam_roll_no = ? AND LOWER(student_name) = LOWER(?)
       AND email = ? AND date_of_birth = ? LIMIT 1`,
    [college, examRollNumber, studentName, email, dateOfBirth],
  );
  return rows[0] || null;
}

export async function findResultById(id) {
  await ensureSchema();
  const [rows] = await getPool().execute(
    `SELECT ${resultColumns} FROM delhi_uni_result_documents WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

export async function listResults(search = "") {
  await ensureSchema();
  if (!search) {
    const [rows] = await getPool().query(
      `SELECT ${resultColumns} FROM delhi_uni_result_documents ORDER BY updated_at DESC LIMIT 250`,
    );
    return rows;
  }
  const like = `%${search}%`;
  const [rows] = await getPool().execute(
    `SELECT ${resultColumns} FROM delhi_uni_result_documents
     WHERE exam_roll_no LIKE ? OR enrollment_no LIKE ? OR student_name LIKE ? OR college LIKE ?
     ORDER BY updated_at DESC LIMIT 250`,
    [like, like, like, like],
  );
  return rows;
}

export async function createResult(payload, pdf) {
  await ensureSchema();
  const now = new Date().toISOString();
  const [result] = await getPool().execute(
    `INSERT INTO delhi_uni_result_documents (
      college, exam_roll_no, enrollment_no, student_name, email, date_of_birth,
      programme, current_semester, exam_session, result_declared_on,
      pdf_object_key, pdf_filename, pdf_size_bytes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.college,
      payload.examRollNumber,
      payload.enrollmentNumber,
      payload.studentName,
      payload.email,
      payload.dateOfBirth,
      payload.programme,
      payload.currentSemester,
      payload.examSession,
      payload.resultDeclaredOn,
      pdf.objectKey,
      pdf.filename,
      pdf.size,
      now,
      now,
    ],
  );
  return findResultById(result.insertId);
}

/** `pdf` is null when the administrator edits identifiers without replacing the document. */
export async function updateResult(id, payload, pdf) {
  await ensureSchema();
  const now = new Date().toISOString();
  const replacing = pdf ? 1 : 0;
  await getPool().execute(
    `UPDATE delhi_uni_result_documents SET
      college = ?, exam_roll_no = ?, enrollment_no = ?, student_name = ?, email = ?,
      date_of_birth = ?, programme = ?, current_semester = ?, exam_session = ?, result_declared_on = ?,
      pdf_object_key = CASE WHEN ? = 1 THEN ? ELSE pdf_object_key END,
      pdf_filename = CASE WHEN ? = 1 THEN ? ELSE pdf_filename END,
      pdf_size_bytes = CASE WHEN ? = 1 THEN ? ELSE pdf_size_bytes END,
      updated_at = ?
     WHERE id = ?`,
    [
      payload.college,
      payload.examRollNumber,
      payload.enrollmentNumber,
      payload.studentName,
      payload.email,
      payload.dateOfBirth,
      payload.programme,
      payload.currentSemester,
      payload.examSession,
      payload.resultDeclaredOn,
      replacing,
      pdf?.objectKey || null,
      replacing,
      pdf?.filename || null,
      replacing,
      pdf?.size || 0,
      now,
      id,
    ],
  );
  return findResultById(id);
}

export async function deleteResult(id) {
  await ensureSchema();
  await getPool().execute("DELETE FROM delhi_uni_result_documents WHERE id = ?", [id]);
}

export async function writeAudit(action, resultId, ipAddress) {
  await ensureSchema();
  await getPool().execute(
    "INSERT INTO delhi_uni_audit_log (action, result_id, ip_address, created_at) VALUES (?, ?, ?, ?)",
    [action, resultId || null, ipAddress || null, new Date().toISOString()],
  );
}

export function isDuplicateError(error) {
  return error?.code === "ER_DUP_ENTRY";
}
