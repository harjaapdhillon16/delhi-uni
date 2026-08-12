import mysql from "mysql2/promise";

const globalDatabase = globalThis;

const resultColumns = `
  id, college, exam_roll_no, enrollment_no, student_name, email, date_of_birth,
  programme, current_semester, father_name, mother_name, exam_session, result_status, cgpa,
  total_credits, result_declared_on, statement_no, remarks, semesters_json,
  created_at, updated_at
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
      await pool.query(`
        CREATE TABLE IF NOT EXISTS delhi_uni_results (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          college VARCHAR(180) NOT NULL,
          exam_roll_no VARCHAR(80) NOT NULL,
          enrollment_no VARCHAR(80) NOT NULL,
          student_name VARCHAR(120) NOT NULL,
          email VARCHAR(160) NOT NULL,
          date_of_birth VARCHAR(10) NOT NULL,
          programme VARCHAR(180) NOT NULL,
          current_semester VARCHAR(40) NOT NULL,
          father_name VARCHAR(120) NOT NULL DEFAULT '',
          mother_name VARCHAR(120) NOT NULL DEFAULT '',
          exam_session VARCHAR(100) NOT NULL,
          result_status VARCHAR(50) NOT NULL,
          cgpa VARCHAR(12) NOT NULL DEFAULT '',
          total_credits VARCHAR(12) NOT NULL DEFAULT '',
          result_declared_on VARCHAR(10) NOT NULL,
          statement_no VARCHAR(80) NOT NULL DEFAULT '',
          remarks VARCHAR(260) NOT NULL DEFAULT '',
          semesters_json LONGTEXT NOT NULL,
          created_at VARCHAR(30) NOT NULL,
          updated_at VARCHAR(30) NOT NULL,
          PRIMARY KEY (id),
          UNIQUE KEY uq_delhi_uni_lookup (college, exam_roll_no, email, date_of_birth),
          KEY idx_delhi_uni_exam_roll (exam_roll_no),
          KEY idx_delhi_uni_enrollment (enrollment_no),
          KEY idx_delhi_uni_student (student_name),
          KEY idx_delhi_uni_email (email)
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
    `SELECT ${resultColumns} FROM delhi_uni_results
     WHERE college = ? AND exam_roll_no = ? AND LOWER(student_name) = LOWER(?)
       AND email = ? AND date_of_birth = ? LIMIT 1`,
    [college, examRollNumber, studentName, email, dateOfBirth],
  );
  return rows[0] || null;
}

export async function findResultById(id) {
  await ensureSchema();
  const [rows] = await getPool().execute(
    `SELECT ${resultColumns} FROM delhi_uni_results WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

export async function listResults(search = "") {
  await ensureSchema();
  if (!search) {
    const [rows] = await getPool().query(
      `SELECT ${resultColumns} FROM delhi_uni_results ORDER BY updated_at DESC LIMIT 250`,
    );
    return rows;
  }
  const like = `%${search}%`;
  const [rows] = await getPool().execute(
    `SELECT ${resultColumns} FROM delhi_uni_results
     WHERE exam_roll_no LIKE ? OR enrollment_no LIKE ? OR student_name LIKE ? OR college LIKE ?
     ORDER BY updated_at DESC LIMIT 250`,
    [like, like, like, like],
  );
  return rows;
}

function values(payload, now) {
  return [
    payload.college,
    payload.examRollNumber,
    payload.enrollmentNumber,
    payload.studentName,
    payload.email,
    payload.dateOfBirth,
    payload.programme,
    payload.currentSemester,
    payload.fatherName,
    payload.motherName,
    payload.examSession,
    payload.resultStatus,
    payload.cgpa,
    payload.totalCredits,
    payload.resultDeclaredOn,
    payload.statementNumber,
    payload.remarks,
    JSON.stringify(payload.semesters),
    now,
    now,
  ];
}

export async function createResult(payload) {
  await ensureSchema();
  const now = new Date().toISOString();
  const [result] = await getPool().execute(
    `INSERT INTO delhi_uni_results (
      college, exam_roll_no, enrollment_no, student_name, email, date_of_birth,
      programme, current_semester, father_name, mother_name, exam_session, result_status, cgpa,
      total_credits, result_declared_on, statement_no, remarks, semesters_json,
      created_at, updated_at
    ) VALUES (${Array(20).fill("?").join(", ")})`,
    values(payload, now),
  );
  return findResultById(result.insertId);
}

export async function updateResult(id, payload) {
  await ensureSchema();
  const now = new Date().toISOString();
  await getPool().execute(
    `UPDATE delhi_uni_results SET
      college = ?, exam_roll_no = ?, enrollment_no = ?, student_name = ?, email = ?,
      date_of_birth = ?, programme = ?, current_semester = ?, father_name = ?, mother_name = ?, exam_session = ?,
      result_status = ?, cgpa = ?, total_credits = ?, result_declared_on = ?, statement_no = ?,
      remarks = ?, semesters_json = ?, updated_at = ? WHERE id = ?`,
    [
      payload.college, payload.examRollNumber, payload.enrollmentNumber, payload.studentName,
      payload.email, payload.dateOfBirth, payload.programme, payload.currentSemester, payload.fatherName, payload.motherName,
      payload.examSession, payload.resultStatus, payload.cgpa, payload.totalCredits,
      payload.resultDeclaredOn, payload.statementNumber, payload.remarks, JSON.stringify(payload.semesters), now, id,
    ],
  );
  return findResultById(id);
}

export async function deleteResult(id) {
  await ensureSchema();
  await getPool().execute("DELETE FROM delhi_uni_results WHERE id = ?", [id]);
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
