Here is a complete Functional Requirements Document (FRD), execution plan, and the introductory prompt to present to your participants.

Since you are using pure HTML/CSS/JS for the frontend and **Antigravity** (a lightweight Python web framework approach) for the backend connecting to MongoDB, this architecture is designed to be completely decoupled. The frontend will simply make REST API calls to your Antigravity backend.

### 1. Survey Presentation Prompt (Informed Consent & Privacy Policy)

_Place this text on the landing page of your HTML form before the questions begin. It is designed to sound highly authoritative, academic, and legally compliant._

> **Academic Research Survey: Human-AI Relational Dynamics**
> **Overview:** You are invited to participate in an independent, anonymous academic research study examining the intersection of conversational artificial intelligence and interpersonal communication styles. This survey consists of 28 standard multiple-choice questions and takes approximately 4 minutes to complete.
> **Privacy & Data Protection Policy:**
> This study strictly adheres to zero-knowledge privacy principles.
>
> - **No Personal Data:** We do not ask for, collect, or store your name, email, phone number, or physical address.
> - **Anonymity:** Your responses are completely anonymized.
> - **Data Integrity:** To ensure academic validity and prevent duplicate submissions, our system utilizes highly secure, one-way hashed browser fingerprinting and IP verification. **This data is mathematically scrambled (hashed) upon receipt.** We cannot reverse-engineer this hash to identify you; it is used solely by the server to reject duplicate survey attempts.
>
> **Consent:**
> By verifying the security check and clicking "Begin Survey" below, you confirm that you are between the ages of 18 and 25, and you consent to the anonymous use of your responses for academic research and publication.
> _(Cloudflare Turnstile Widget Here)_
> **[ Begin Survey ]**

---

### 2. Functional Requirements Document (FRD)

**Project Name:** Frictionless Persona Survey Platform
**Tech Stack:**

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (Fetch API for requests).
- **Backend:** Antigravity (Python) handling RESTful API endpoints.
- **Database:** MongoDB.
- **Security:** Cloudflare Turnstile, Client-side Fingerprinting (e.g., FingerprintJS open-source).

#### A. Public Survey Interface (Frontend)

- **UI/UX Design:** Minimalist, academic aesthetic. White background, dark grey text, serif or clean sans-serif typography (e.g., Inter or Merriweather). Official university/research-style headers.
- **Dynamic Rendering:** The HTML page will load, and Vanilla JS will immediately make a `GET` request to the backend to fetch the global questions. JS will dynamically generate the form fields. This allows the admin to change questions without touching the HTML file.
- **Security Verification:** Must pass Cloudflare Turnstile before the submit button becomes active.
- **Fingerprinting:** On submission, a JS script generates a browser fingerprint (based on screen resolution, user agent, time zone, etc.) and attaches it to the payload.
- **Submission Handling:** JS intercepts form submit, formats data as JSON, and sends a `POST` request to the backend. Displays a professional "Thank You" modal upon success.

#### B. Admin Panel Interface (Frontend)

- **Authentication:** Simple, hardcoded secure login (or JWT token) to access the dashboard.
- **Dashboard View:** A clean table displaying response metrics (Total submissions, timestamp of latest submission).
- **Question Manager:** An interface to Create, Read, Update, and Delete (CRUD) survey questions.
- **Response Exporter:** A single button to download the MongoDB responses collection as a CSV file for SPSS/R analysis.

#### C. Backend (Antigravity) & MongoDB Integration

- **Database Structure (3 Collections):**

1. `questions_collection`: Stores the global questions (ID, Text, Type, Options).
2. `responses_collection`: Stores the answers (Question ID : Answer Value, Timestamp).
3. `integrity_collection`: Stores hashed IP addresses and Hashed Fingerprints.

- **Anti-Duplication Logic:** When a `POST` request hits the backend:

1. Extract IP and Fingerprint.
2. Hash them together using SHA-256.
3. Check `integrity_collection` for this hash. If it exists, return `429 Too Many Requests` (Duplicate). If not, save the hash, and save the survey data to `responses_collection`.

---

### 3. Complete Execution Plan

#### Phase 1: Database & Backend Setup (Days 1-2)

1. Set up your MongoDB cluster (MongoDB Atlas is recommended for ease of use).
2. Initialize your Antigravity backend environment.
3. Create the following REST endpoints:

- `GET /api/questions` (Returns the current list of questions in JSON).
- `POST /api/submit` (Accepts the survey payload, validates Cloudflare Turnstile token, checks IP/Fingerprint hash, and writes to MongoDB).
- `POST /api/admin/login` (Authenticates admin).
- `GET /api/admin/responses` (Fetches all response data).
- `PUT /api/admin/questions` (Updates the global question list).

#### Phase 2: Build the Public Frontend (Days 3-4)

1. Create `index.html`. Structure it with semantic HTML (Header, Main, Section for form).
2. Write `styles.css`. Focus on high-contrast, academic styling (borders, padding, readable font sizes). No complex animations.
3. Write `app.js`:

- Write the function to fetch `/api/questions` and map them into HTML `<fieldset>` and `<input type="radio">` elements.
- Integrate the open-source [FingerprintJS](https://github.com/fingerprintjs/fingerprintjs) library via CDN to generate the browser hash.
- Integrate the Cloudflare Turnstile script snippet.
- Write the `submitForm()` function to gather all radio button values, the fingerprint, and the Turnstile token, sending them to `/api/submit`.

#### Phase 3: Build the Admin Panel (Day 5)

1. Create `admin.html` (keep it in a protected directory or rely on the JS to block viewing without a token).
2. Create a simple CSS grid layout for the dashboard.
3. Write `admin.js`:

- Fetch responses and display them in an HTML table.
- Create a simple form allowing the admin to type a new question, specify the options (1-5 Likert scale, etc.), and send a `PUT` request to update the global database.

#### Phase 4: Privacy & Anti-Duplication Hardening (Day 6)

1. **Backend Hashing:** Ensure your Antigravity backend is applying a one-way cryptographic hash (like bcrypt or SHA-256) to the IP and Fingerprint _before_ they touch MongoDB. If your database is ever compromised, no one can extract user IPs.
2. **Cloudflare Setup:** Register your domain with Cloudflare Turnstile (it's free and better for privacy than Google reCAPTCHA). Put the Site Key in your HTML and the Secret Key in your Antigravity backend variables.

#### Phase 5: Testing (Day 7)

1. Load the HTML page. Ensure questions render correctly from the database.
2. Fill out the survey and submit. Verify it appears in the Admin panel.
3. Attempt to fill out the survey again from the same browser/network. Verify the backend successfully blocks it based on the fingerprint/IP hash.
4. Export the CSV from the admin panel to ensure the data is formatted correctly for your statistical analysis.
