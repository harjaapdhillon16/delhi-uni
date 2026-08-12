# delhi-uni

An independent, clearly labelled demonstration of a Delhi University-style semester results portal. It is not an
official University of Delhi service and does not issue valid academic documents.

## Features

- Next.js 16 App Router, deployable on Vercel
- Public lookup using college/department, exam roll number, student name, email, and date of birth
- PIN-protected administration at `/admin` (initial requested PIN: `1280`)
- Plain inputs for candidate details, examination data, semester summaries, and every paper row
- All project tables use the `delhi_uni_` prefix
- A score-card-style HTML result with persistent **DEMO / NOT OFFICIAL** labelling
- Browser-generated A4 PDF download; result PDFs are never uploaded to or stored in MySQL

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
| `SESSION_SECRET` | Yes | At least 32 random characters used to sign admin sessions |
| `MYSQL_CA` | Recommended | Aiven CA certificate using `\n` line breaks for full certificate verification |

The supplied MySQL connection is encrypted. Configure `MYSQL_CA` in Vercel for full server identity verification.

## Database tables

- `delhi_uni_results`
- `delhi_uni_audit_log`

No PDF or image columns are used. The supplied transcript reference has no candidate photograph, so this project
does not request, upload, or display one.

## Verification

```bash
npm test
npm run lint
npm run build
```
