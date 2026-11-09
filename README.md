# IIT Academic Research Survey Platform

A minimal, full-stack Next.js platform designed for academic survey administration, zero-knowledge privacy, anti-duplication cryptographic integrity, and SPSS/R statistical export.

## 🚀 Quick Start

### 1. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 2. Admin Dashboard & SPSS/R CSV Export
Open **[http://localhost:3000/admin](http://localhost:3000/admin)**
- **Admin Password:** `academic_secure_password_2026` (configurable in `.env.local`)
- Features: Live submission counter, recent submissions view, and one-click **"Download SPSS / R CSV"** button.

---

## 🔬 Battery Structure & Questionnaires

The platform includes all 24 standardized questions from `questionnaires.md`:
1. **Demographic & Inclusion Screening:** Age (18–25 inclusion), frequency of companion AI interaction, relationship status, weekly hours.
2. **The Artificial Intelligence Chatbot Dependence Scale (AICDS):** 8 items (7-point Likert).
3. **Perceived Emotional Validation from AI (Adapted MSPSS):** 4 items (7-point Likert).
4. **The Dutch Test for Conflict Handling (DUTCH):** 8 items (5-point Likert: 4 Avoidance + 4 Problem-solving).

---

## 🔒 Privacy & Anti-Duplication Integrity

- **Zero-Knowledge Privacy:** No PII (names, emails, phones, or raw IP addresses) is stored in the database.
- **SHA-256 Hash Guard:** When a survey is submitted, the client's IP and browser fingerprint are mathematically scrambled with a server salt (`hashIntegrity(ip, fingerprint)`).
- **Duplicate Prevention:** If an identical hash is submitted, the server rejects it with an HTTP 429 status code.

---

## 📁 Project Architecture

- `app/page.tsx`: Public academic survey UI (Informed Consent, Turnstile, dynamic questionnaire, completion modal).
- `app/admin/page.tsx`: Admin dashboard with metrics and one-click SPSS/R CSV export.
- `app/api/questions/route.ts`: Question loader with automatic MongoDB seeding.
- `app/api/submit/route.ts`: Submission validation, Turnstile verification, and anti-duplication hash guard.
- `app/api/admin/export/route.ts`: CSV stream generator with column headers aligned for SPSS/R import.
- `lib/mongodb.ts`: Cached MongoDB client connection pool.
- `lib/security.ts`: SHA-256 integrity hasher and Turnstile verification.
- `lib/questions.ts`: Standard 24-question battery schema and definitions.
