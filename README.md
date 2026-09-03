# delhi-uni

An independent, clearly labelled Delhi University-style semester results portal. It is not an
official University of Delhi service and does not issue valid academic documents.

An administrator enters the five values the public search asks for and uploads the score-card PDF. The PDF is stored
in Supabase storage; MySQL holds only those identifiers and a reference to the stored object. When a candidate's
five values match a record, the portal streams that PDF back and renders it in the page.

## How it works

1. The administrator signs in at `/admin` and adds a record: college/department, exam roll number, student name,
   email, and date of birth, plus the score-card PDF.
2. The PDF is uploaded to the Supabase `objects` bucket under `delhi-uni-results/<exam-roll>/<uuid>.pdf`.
3. The row in `delhi_uni_result_documents` stores the identifiers and `pdf_object_key`.
4. A candidate fills in the five values on the landing page. On an exact match the API returns a signed, one-hour
   link to `/api/results/<id>/document`.
5. That route re-checks the signature, fetches the object from Supabase with the service-role key, and streams it
   as `application/pdf` — inline for the viewer, or as an attachment for the download button.

The bucket stays private. Supabase URLs and keys are never exposed to the browser; every read passes through the
app's own signed-link route.

## Features

- Next.js 16 App Router, deployable on Vercel
- Public lookup using college/department, exam roll number, student name, email, and date of birth
- PIN-protected administration at `/admin` (initial requested PIN: `1280`)
- Supabase storage for the score-card PDFs, MySQL for identifiers and object references
- PDF replacement on edit, with the superseded object removed after the row is updated
- Deleting a record also deletes its stored PDF
- In-page PDF viewer plus a direct download
- Signed, one-hour score-card URLs issued only after a successful match
- All project tables use the `delhi_uni_` prefix

## Local setup

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

Open `http://localhost:3000` for the public result form and `http://localhost:3000/admin` for administration.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | MySQL connection string with `ssl-mode=REQUIRED` |
| `ADMIN_PIN` | Yes | Administration PIN; change it before public deployment |
| `SESSION_SECRET` | Yes | At least 32 random characters used to sign admin sessions and document links |
| `SUPABASE_URL` | Yes | Supabase project URL (the `/rest/v1` suffix is accepted and trimmed) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side key used to read and write bucket objects |
| `SUPABASE_BUCKET` | No | Storage bucket name, `objects` by default |
| `SUPABASE_ANON_KEY` | No | Kept for reference; the server paths use the service-role key |
| `MYSQL_CA` | Recommended | Aiven CA certificate using `\n` line breaks for full certificate verification |

`npm run db:migrate` creates the MySQL tables and the storage bucket if either is missing, so a fresh project needs
no manual setup.

## Database tables

- `delhi_uni_result_documents`
- `delhi_uni_audit_log`

Uploads are capped at 20 MB and the `%PDF-` signature is checked server-side before anything reaches storage. Note
that Vercel Functions impose their own request-body limit, which is lower than 20 MB on some plans.

## Verification

```bash
npm test
npm run lint
npm run build
```
