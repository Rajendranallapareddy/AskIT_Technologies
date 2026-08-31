# ASK IT Technologies — Complete Setup Guide

This is a start-to-finish walkthrough: installing prerequisites, configuring every secret/credential,
running the app locally, and later changing (rotating) IDs, passwords, and keys safely.

---

## 0. What you need installed first

| Tool | Version | Check with |
|---|---|---|
| Node.js | 18 or newer | `node -v` |
| npm | comes with Node | `npm -v` |
| PostgreSQL | 14 or newer | `psql --version` |
| (Optional) Docker + Docker Compose | any recent version | `docker --version` |
| (Optional) Razorpay account | test mode is fine | — |

If you don't want to install Postgres locally, skip to **Section 8 (Docker)** — it handles the database
for you.

---

## 1. Unzip the project

```bash
unzip askit-platform.zip
cd askit-platform
```

You'll see two folders: `backend/` (API + database) and `frontend/` (the website/app).

---

## 2. Create the database

Open a terminal with `psql` (or use a GUI tool like pgAdmin/TablePlus) and run:

```sql
CREATE DATABASE askit_db;
CREATE USER askit_user WITH PASSWORD 'choose-a-strong-password-here';
GRANT ALL PRIVILEGES ON DATABASE askit_db TO askit_user;
```

> You can use any database name, username, and password you like — just remember them for the next
> step. If you'd rather use your existing `postgres` superuser account for local dev, that's fine too;
> just skip the `CREATE USER` line.

---

## 3. Configure the backend (`backend/.env`)

```bash
cd backend
cp .env.example .env
```

Now open `backend/.env` in any text editor and fill in each value. Here's what every line means and
how to change it:

### 3.1 Server basics
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```
Leave these as-is for local development. `FRONTEND_URL` is used for CORS and for building links inside
emails/receipts — change it to your real domain when you deploy.

### 3.2 Database connection
```env
DATABASE_URL="postgresql://askit_user:choose-a-strong-password-here@localhost:5432/askit_db?schema=public"
```
Replace `askit_user`, `choose-a-strong-password-here`, and `askit_db` with whatever you set in Section 2.
Format is always: `postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME?schema=public`

### 3.3 JWT secrets (session security)
```env
JWT_ACCESS_SECRET=replace_with_a_long_random_string
JWT_REFRESH_SECRET=replace_with_a_different_long_random_string
```
These sign every login session — they must be long, random, and **different from each other**.
Generate two strong ones:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Run it twice (once per secret) and paste each result in. Never reuse these across projects, and never
commit real values to git — `.env` is already in `.gitignore`.

### 3.4 The permanent Super Admin account
```env
SUPER_ADMIN_NAME=ASK IT Super Admin
SUPER_ADMIN_EMAIL=superadmin@askittechnologies.com
SUPER_ADMIN_PASSWORD=ChangeMe@12345
SUPER_ADMIN_MOBILE=9999999999
```
**This is the login you'll use to access `/admin/dashboard` the first time.** Change:
- `SUPER_ADMIN_EMAIL` to the real email you want to log in with
- `SUPER_ADMIN_PASSWORD` to a strong password (min 8 chars, upper+lower+number+symbol — see §9.1 to
  change it again later from inside the app)
- `SUPER_ADMIN_MOBILE` to a valid-looking 10-digit number (doesn't need to be real for local dev)

This account is only created **once**, the first time you run the seed script (Section 5.3). If you
change these values *after* seeding, nothing happens automatically — see §9.1 for how to update it later.

### 3.5 Email (optional for local dev)
```env
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="ASK IT Technologies <no-reply@askittechnologies.com>"
```
Leave blank for local testing — verification/reset emails will just print to your backend terminal
instead of actually sending. To send real emails, fill in credentials from any SMTP provider (Gmail
app password, SendGrid, Mailgun, Amazon SES, etc.).

### 3.6 Payments (Razorpay)
```env
PAYMENT_GATEWAY=RAZORPAY
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```
- Set `PAYMENT_GATEWAY=MANUAL` if you want to skip Razorpay entirely for now and only use the admin's
  "Record Offline Payment" feature — the rest of the app works fine without a gateway configured.
- To get real test keys: sign up at https://dashboard.razorpay.com (free), switch to **Test Mode**
  (toggle top-left), go to **Settings → API Keys → Generate Test Key**. Copy the Key ID and Key Secret
  into `.env`.
- For the webhook secret: in the Razorpay dashboard go to **Settings → Webhooks → Add New Webhook**,
  set the URL to `https://your-domain.com/api/payments/webhook` (use a tool like `ngrok` to expose
  `localhost:5000` for local testing), pick the `payment.captured` and `payment.failed` events, and
  copy the secret it gives you.

### 3.7 Encryption key (protects stored bank/gateway secrets)
```env
ENCRYPTION_KEY=replace_with_a_32_byte_base64_key
```
Generate one:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Paste the output in. This encrypts any bank account numbers or gateway secrets entered through the
Super Admin's "Payment Accounts" page — treat it like a password and never commit it.

---

## 4. Install backend dependencies

```bash
# still inside backend/
npm install
```

---

## 5. Set up the database tables and Super Admin

```bash
npx prisma migrate dev --name init
```
This reads `prisma/schema.prisma` and creates every table in your database.

```bash
npm run seed
```
This creates:
- The permanent Super Admin account (using the values from §3.4)
- 6 starter courses so the public site isn't empty

You'll see output like:
```
✔ Created permanent Super Admin: superadmin@askittechnologies.com
  Login with the password set in SUPER_ADMIN_PASSWORD (see .env).
✔ Seeded 6 starter courses.
```

---

## 6. Start the backend

```bash
npm run dev
```
You should see:
```
🚀 ASK IT Technologies API running at http://localhost:5000
```
Leave this terminal running. Open a **new terminal** for the frontend.

---

## 7. Start the frontend

```bash
cd ../frontend      # from the backend folder, or `cd frontend` from the project root
npm install
npm run dev
```
You should see a local URL, typically:
```
Local:   http://localhost:5173/
```
Open that in your browser. The public site should load. No frontend `.env` is needed for local
development — Vite automatically forwards `/api` and `/uploads` requests to `localhost:5000`.

---

## 8. (Alternative) Run everything with Docker instead

If you'd rather not install Postgres/Node locally at all:

```bash
# from the project root (askit-platform/)
docker compose up --build
```

Before running this, open `docker-compose.yml` and edit the same values described in Section 3
(they're set as plain environment variables under the `backend` service) — especially
`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SUPER_ADMIN_PASSWORD`, `ENCRYPTION_KEY`, and the Razorpay
keys if you're testing payments.

This spins up Postgres, runs migrations, seeds the Super Admin, and starts both the API
(`localhost:5000`) and frontend (`localhost:5173`) automatically.

---

## 9. Changing credentials, IDs, and secrets *after* first setup

### 9.1 Change the Super Admin's password or email (recommended right after first login)
1. Log in at `http://localhost:5173/login` with the credentials from `backend/.env` (§3.4).
2. You'll land on `/admin/dashboard`. There isn't a dedicated UI button for the Super Admin's own
   profile yet in the sidebar, so use the API directly once, or ask me to add a "My Account" page —
   in the meantime the safest path is:
   ```bash
   curl -X PUT http://localhost:5000/api/superadmin/profile \
     -H "Content-Type: application/json" \
     -b "askit_access_token=<paste the cookie value from your browser dev tools>" \
     -d '{"currentPassword":"ChangeMe@12345","newPassword":"YourNewStrongPassword@1"}'
   ```
   (Open DevTools → Application → Cookies → copy the `askit_access_token` value after logging in.)
3. Alternatively, edit `SUPER_ADMIN_PASSWORD` in `.env` **before ever running `npm run seed`** — the
   seed script only creates the account once, so this only works pre-seed. If you've already seeded,
   use the API call above, or drop the `User` row where `isProtected = true` from the database and
   re-run `npm run seed` (this deletes the account and all its activity logs — only do this in a dev
   database you don't care about).

### 9.2 Add or remove Sub Admins and their passwords
- As the Super Admin, go to **Admin Portal → Sub Admins → Add Sub Admin**. Set their email/password
  there directly — no `.env` editing needed.
- To reset a Sub Admin's password later, use **Sub Admins → (toggle) → Reset Password** in the UI, or
  the `PUT /api/superadmin/sub-admins/:id/reset-password` endpoint.

### 9.3 Rotate JWT secrets
Changing `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` in `.env` and restarting the backend immediately
invalidates **every** logged-in session (everyone gets logged out and must log in again). This is the
right move if you ever suspect a secret leaked. Generate new ones the same way as §3.3.

### 9.4 Rotate the encryption key
`ENCRYPTION_KEY` encrypts payment account secrets already stored in the database. If you change it,
**previously saved bank/gateway secrets become unreadable** (they were encrypted with the old key).
Before rotating: note down any payment accounts you've saved, change the key, restart the backend, and
re-enter those accounts through the Payment Accounts page so they get re-encrypted with the new key.

### 9.5 Change database credentials
1. In Postgres: `ALTER USER askit_user WITH PASSWORD 'new-password';`
2. Update `DATABASE_URL` in `backend/.env` to match.
3. Restart the backend (`npm run dev`).

### 9.6 Switch payment gateway keys (e.g. moving from test to live Razorpay keys)
1. Get your **live** Key ID/Secret from the Razorpay dashboard (switch off Test Mode).
2. Update `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` in `backend/.env`.
3. Restart the backend. No database changes needed — the gateway adapter reads these fresh on startup.
4. Double-check `FRONTEND_URL` and your Razorpay webhook URL both point at your real production domain,
   not `localhost`.

### 9.7 Regenerate a user's password (student or trainer) as an admin
Go to **Admin Portal → Users → (find the user) → Reset Password icon**, or the trainer equivalent under
**Trainers**. This doesn't touch `.env` at all — it's a normal in-app action.

---

## 10. Quick troubleshooting

| Problem | Likely cause / fix |
|---|---|
| Backend won't start, Prisma error | `DATABASE_URL` is wrong, or Postgres isn't running. Test with `psql "$DATABASE_URL"`. |
| `relation "User" does not exist` | You skipped `npx prisma migrate dev`. Run it. |
| Can't log in as Super Admin | Check you ran `npm run seed` at least once, and that the email/password match what was in `.env` **at seed time**. |
| Frontend loads but API calls fail (network errors) | Backend isn't running, or it's on a different port than `5000`. Check the backend terminal. |
| Payment checkout button does nothing | `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are still placeholders. Either fill in real test keys or set `PAYMENT_GATEWAY=MANUAL` and use offline payment recording instead. |
| Uploaded images/certificates 404 | Make sure the backend's `uploads/` folder exists and is writable — it's created automatically on first upload, but check filesystem permissions if running in a locked-down environment. |
| "Too many attempts" errors | You've hit a rate limiter (intentional, protects login/payment endpoints from abuse). Wait a few minutes. |

---

## 11. Recap: the minimum you must change before sharing this with anyone else

- [ ] `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — long random strings, never the defaults
- [ ] `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` — your real login, strong password
- [ ] `ENCRYPTION_KEY` — real 32-byte base64 key
- [ ] `DATABASE_URL` — real credentials, not a shared/default password
- [ ] Razorpay keys — real test or live keys (or `PAYMENT_GATEWAY=MANUAL` if skipping payments for now)

Everything above lives only in `backend/.env` (or `docker-compose.yml` if using Docker) — never in
code, never in the frontend, and never committed to version control.
