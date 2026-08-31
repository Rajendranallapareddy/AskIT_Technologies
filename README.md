# ASK IT Technologies — Platform

A full-stack web platform for ASK IT Technologies: a public marketing site plus a role-based
portal for Students, Trainers, Sub Admins, and a Super Admin — covering course/internship management,
registrations, attendance, certificates, and more.

**Stack:** React + TypeScript + Vite + Tailwind (frontend) · Node.js + Express + TypeScript + Prisma + PostgreSQL (backend)

---

## ⚠️ Updating an existing installation? Run this first

This version adds new database fields (Zoom link/meeting ID/passcode on class
sessions). If you already have this project running with a database from an
earlier version, pull this update and then run, from `backend/`:

```bash
npx prisma migrate dev --name add_zoom_and_session_features
```

Prisma will compare your existing migration history against the current
`schema.prisma` and generate only the incremental changes needed — it will
not touch or delete your existing data. Skipping this step will make the
backend crash on startup with a Prisma schema-mismatch error.

Also: because Sub Admin permissions are now correctly included at login
(previously they were missing from the login response and only loaded on a
full page refresh), **any Sub Admin who is already logged in should log out
and log back in once** to pick up this fix.

## 1. What's included

- **Public site**: Home, About, Courses, Internships (list + detail + apply), Trainers, Placements,
  Gallery, Success Stories, FAQ, Contact, Privacy Policy, Terms.
- **Auth**: Register, Login, Email verification, Forgot/Reset password, JWT access + refresh tokens
  (httpOnly cookies), rate limiting on auth routes.
- **Student portal**: Dashboard, Profile, My Internships (register/cancel), Attendance, Certificates,
  Notifications, History.
- **Trainer portal**: Dashboard, Participants, Attendance sessions & marking, Study materials upload,
  Announcements.
- **Admin portal** (Sub Admin — permission-gated, Super Admin — full access): Dashboard, Users,
  Internships, Registrations (approve/reject), Trainers (create & assign), Attendance reports,
  Certificates (generate & issue as PDF), Announcements, Contact requests.
- **Payments**: Razorpay-backed checkout (UPI/cards/netbanking/wallets), server-verified transactions,
  PDF receipts with QR verification, refunds, coupons/discounts, early-bird pricing, GST, offline
  payment recording, and a full admin payments dashboard with export & revenue analytics. See §7.
- **Super Admin exclusive**: Create/manage Sub Admins, granular permission toggles per Sub Admin,
  full Activity Log (audit trail) of every admin action. The Super Admin account is "protected" and
  cannot be deleted, deactivated, or demoted by anyone — including other Super Admin-level code paths.

## 2. Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ (local install, or use the provided Docker Compose setup)
- (Optional) Docker & Docker Compose, if you'd rather not install Postgres locally
- A Razorpay account (test mode is fine) if you want to exercise real payments — see §9

## 3. Quick Start — without Docker

### 3.1 Database
Create a Postgres database (e.g. `askit_db`) and note its connection string.

### 3.2 Backend
```bash
cd backend
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL to your Postgres connection string,
# and change JWT_ACCESS_SECRET / JWT_REFRESH_SECRET to long random strings.

npm install
npx prisma migrate dev --name init   # creates all tables
npm run seed                          # creates the permanent Super Admin + starter courses
npm run dev                           # starts the API on http://localhost:5000
```

The seed script prints the Super Admin's login email; the password is whatever you set as
`SUPER_ADMIN_PASSWORD` in `.env` (defaults to `ChangeMe@12345` — change this before going live).

### 3.3 Frontend
In a second terminal:
```bash
cd frontend
npm install
npm run dev     # starts the app on http://localhost:5173
```

Vite is pre-configured to proxy `/api` and `/uploads` requests to `http://localhost:5000`, so no
frontend `.env` is required for local development.

Open **http://localhost:5173** — the public site should load immediately. Log in with the Super Admin
credentials to reach `/admin/dashboard`.

## 4. Quick Start — with Docker

```bash
docker compose up --build
```

This starts Postgres, runs migrations, seeds the Super Admin, and starts both the API
(`http://localhost:5000`) and frontend (`http://localhost:5173`). Edit the environment variables in
`docker-compose.yml` (JWT secrets, Super Admin credentials) before using this in anything beyond local
testing.

## 5. Project Structure

```
askit-platform/
├── backend/     # Express + TypeScript API, Prisma schema & migrations
└── frontend/    # React + TypeScript + Vite + Tailwind SPA
```
See inline comments in `backend/prisma/schema.prisma` and `frontend/src/App.tsx` for the full data
model and route map, respectively.

## 6. Roles & Permissions

| Role | Access |
|---|---|
| `USER` (Student) | Register for internships, track attendance/certificates, manage own profile |
| `TRAINER` | Manage participants, mark attendance, upload materials, post announcements for assigned internships |
| `SUB_ADMIN` | Same as Super Admin, but scoped to whichever permissions (Users, Internships, Certificates, etc.) the Super Admin has explicitly granted |
| `SUPER_ADMIN` | Full access, plus Sub Admin management, permission control, and the Activity Log |

## 7. Payments Module

A complete, server-verified payment system is integrated for paid internships/courses.

### 9.1 How it works
1. **Order creation** (`POST /api/payments/create-order`) — the server recomputes the price entirely
   from the database (base fee, early-bird window, GST, coupon) and creates a Razorpay order. The
   client never supplies an amount.
2. **Checkout** — the frontend opens Razorpay's hosted checkout (UPI, cards, netbanking, wallets) using
   only the public key ID; the secret key never leaves the server.
3. **Verification** (`POST /api/payments/verify`) — the HMAC signature Razorpay returns is verified
   server-side against the key secret. This is the actual trust boundary — nothing is confirmed until
   this check passes.
4. **Webhook** (`POST /api/payments/webhook`) — a server-to-server confirmation from Razorpay, verified
   against a separate webhook secret, as a defense-in-depth backup to step 3 (covers a user closing
   their browser mid-checkout).
5. On success: the registration is confirmed, a friendly Registration ID and Payment ID are generated,
   a branded PDF receipt with an embedded QR verification code is generated, and a notification is sent.

### 9.2 Getting a Razorpay test account
1. Sign up at https://dashboard.razorpay.com (test mode requires no business verification).
2. Settings → API Keys → generate a test Key ID/Secret → put them in `backend/.env` as
   `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.
3. Settings → Webhooks → add `https://<your-backend-url>/api/payments/webhook`, select the
   `payment.captured` and `payment.failed` events, and put the webhook secret in
   `RAZORPAY_WEBHOOK_SECRET`. (Webhooks need a publicly reachable URL — use a tunnel like `ngrok` for
   local testing, or skip this in dev and rely on step 3 above, which alone is enough for the checkout
   flow to work end-to-end.)
4. Use Razorpay's published test card/UPI credentials to complete a test payment.

### 9.3 Switching gateways
Every gateway integration implements the same `PaymentGatewayAdapter` interface
(`backend/src/services/paymentGateway/types.ts`). To add Stripe, Cashfree, or PhonePe, write one new
adapter file and register it in `paymentGateway/index.ts` — no other code changes needed. Set
`PAYMENT_GATEWAY` in `.env` to select the active one.

### 9.4 Encryption key
Bank account numbers and gateway secrets entered through the Super Admin's "Payment Accounts" page are
encrypted at rest (AES-256-GCM). Generate a key and set it before using that page:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Put the output in `ENCRYPTION_KEY` in `backend/.env`.

### 9.5 What's covered
Order creation & verification, webhooks, receipts (PDF + QR verification page at
`/verify-receipt/:token`), payment history, refund requests (student) and approval/processing (admin),
coupons/discounts, early-bird pricing, GST, offline payment recording with instant approval, CSV/Excel
export, revenue analytics (course-wise + monthly), and a full audit trail via the existing Activity Log.

### 9.6 Security notes specific to payments
- Every amount is recalculated server-side at order creation and never trusted from the client.
- Payment signatures are verified with a constant-time comparison to avoid timing attacks.
- `gatewayPaymentId` has a database-level unique constraint, which is what actually prevents the same
  gateway payment from ever being credited to two different orders (replay protection).
- Duplicate registrations are prevented by a unique `(userId, internshipId)` constraint and by reusing
  an existing unpaid order within a 20-minute window instead of creating a new one.
- Payment/refund/coupon input is validated with `express-validator`; Prisma parameterizes all queries
  (no raw SQL is used anywhere in the payment code, so there's no SQL injection surface).
- IDOR is prevented by scoping every student-facing payment query to `req.user.id` and rejecting
  cross-account access even for admins' read routes unless the RBAC role check passes first.
- Gateway secrets are never sent to the frontend; only the Razorpay public key ID is.

## 8. Notes on things you'll want to configure before production use

- **Email**: If `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` are left blank in `backend/.env`, verification and
  password-reset emails are printed to the backend console instead of sent — handy for local testing,
  not for production. Fill these in with a real SMTP provider (SendGrid, SES, etc.) to send real emails.
- **File uploads**: Profile pictures, trainer photos, gallery images, materials, and generated
  certificate PDFs are stored on local disk under `backend/uploads/`. For a real deployment, consider
  swapping the `upload.service.ts` disk storage for an S3-compatible bucket.
- **Secrets**: Change `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `SUPER_ADMIN_PASSWORD` before
  deploying anywhere public.

## 9. Scope note

This is a substantial, genuinely functional implementation of every module described in the project
brief — not placeholder stubs. That said, a platform of this size (role-based auth, 4 dashboards, full
CRUD across a dozen entities) is normally a multi-week build for a team; if you run into a rough edge
in a less-traveled corner (e.g. very fine-grained validation messages, extra analytics charts), treat
this as a strong, extendable foundation rather than a finished, audited product.
