# Changes in this build

## 1. Refund approval crash (Prisma "Argument `id` is missing")
`backend/src/controllers/refund.controller.ts` was force-unwrapping the
nullable `payment.registrationId` field with `!` and always including a
`registration.update` in the approval transaction. Whenever a payment wasn't
cleanly linked to a registration, that blew up the entire transaction —
including the refund + payment updates that should have succeeded
regardless. Fixed by only including the registration update when there's a
real registration to update, and only on a full refund.

## 2. "Online payment is not available for this internship"
Two bugs combined to cause this:
- The Admin → Payment Settings → "Active Payment Gateway" dropdown updated
  the database but was never actually read by checkout — `createOrder` only
  looked at the `PAYMENT_GATEWAY` environment variable. Fixed: checkout now
  resolves the gateway from the database setting (`getActivePaymentGateway`),
  with the env var only used as the default when the settings row is first
  created.
- `docker-compose.yml` hardcoded `PAYMENT_GATEWAY: MANUAL` even though real
  Razorpay TEST-mode keys were already present in the same file. Default
  flipped to `RAZORPAY` so online checkout works out of the box. Swap in
  your own keys (or your live keys) before going to production.

On top of that fix, online payment failures/unavailability are no longer a
dead end: if the active gateway can't take an online payment right now, the
student's registration is still confirmed immediately with the amount
(or first installment) marked as due, instead of blocking registration
entirely — see the installments section below.

## 3. Installments / "pay later"
Added a proper `InstallmentPlan` model + migration
(`prisma/migrations/20260811070000_installments`). Students can choose
"Pay in Full" or split into 2–3 installments on the internship page; only
the first installment is charged at registration time. Remaining
installments can be paid later online (Payment History → "Pay Now") or
settled offline by an admin (Payments → "Mark Paid", which now also works
for any existing pending payment, not just brand-new offline records).

If the online gateway isn't available at all, registration still succeeds
with the amount due — recorded as a "pay later" payment — instead of
failing outright.

## 4. Receipt clarity
- Receipt PDF (`backend/src/services/receipt.service.ts`): "Amount Paid" is
  now a highlighted band of its own instead of a small row buried in the
  fee breakdown table.
- Payment History page: amounts are now labeled "Amount Paid" / "Amount
  Due" depending on status, installments show a badge (e.g. "Installment 2"),
  and pending/failed payments get a one-click "Pay Now" / "Retry Payment"
  button.

## Also fixed while in there
- Two dashboard pages (`Dashboard.tsx`, `MyInternships.tsx`) called
  `useApiQuery()` without a type argument, which TypeScript widened to `{}`
  — this made `npm run build` (`tsc && vite build`) fail outright. Added
  explicit types so the Docker build actually completes.
- The webhook handler used to resolve "the active gateway" for verifying
  incoming Razorpay webhooks; it now always resolves Razorpay specifically,
  since webhooks only ever arrive from Razorpay regardless of which gateway
  is currently active for new checkouts.

## Before you run it
This container/sandbox couldn't reach Prisma's binary host to run
`prisma generate` end-to-end, so the schema/migration were written and
reviewed carefully but not machine-verified against a live database. Run
once after unzipping:

```bash
cd backend
npm install
npx prisma migrate deploy   # applies the new installments migration
npx prisma generate
```

## 5. Clear payment structure / GST breakdown for students
Previously the internship page just showed one lump total, computed
client-side, and it could even be silently wrong — it only looked at the
internship's own `gstPercentage`, ignoring the site-wide default GST rate
the backend actually charges when an internship doesn't set its own. Now:
- The page calls the same pricing calculation the backend uses at checkout
  (`/api/public/coupons/validate`, called with no coupon to get the base
  breakdown) so the number shown always matches what's charged — no drift
  between preview and checkout.
- A "Payment Structure" card lists: Course Fee (original fee struck through
  if early-bird pricing applies), Coupon Discount (if applied), GST with its
  percentage shown explicitly, and Total Payable.
- Choosing an installment plan shows every installment's exact amount and
  which one is due now vs. later, computed from the real total.
- Coupon apply/remove updates this breakdown live, with a clear inline error
  if a code is invalid instead of just a toast.

## 6. "A record with this registration id already exists" on repeat installment checkout
`InstallmentPlan.registrationId` is unique — one plan per registration,
ever. `createOrder` always tried to `create` a brand-new plan whenever
`installments` was passed, with no check for whether the registration
already had one. So the very first checkout attempt worked fine, but if a
student closed the Razorpay popup without paying (or just came back later)
and clicked "2/3 Installments" again, the second `create` hit the unique
constraint and Prisma's raw "unique constraint failed" error surfaced
straight to the UI. Fixed: before creating a plan, `createOrder` now looks
up whether the registration already has one and, if so, resumes it — finds
the next unpaid installment and returns a fresh checkout order for that
instead of attempting a duplicate plan. This also transparently handles
switching gateways mid-plan (e.g. installment 1 was paid offline, gateway
is online now for installment 2).

## 7. Receipt PDF: amount hidden behind the QR code
The QR code's vertical position was computed as `y - 128` — jumping
*backward* from a cursor position computed further down the page — which
landed it directly on top of the "Amount Paid" highlight band drawn earlier
in the same function. Same coordinates, QR drawn after the band, so it
visually covered the amount. Rewrote the whole receipt layout so every
element is positioned strictly top-to-bottom (nothing is ever placed by
subtracting from a `y` computed later in the function). The QR code now has
its own clearly separated block below all the amount/meta text, with the
verification URL and code also printed as plain text next to it, so the
receipt is still usable even if a scan fails.

## 8. QR code says "site can't be reached"
`FRONTEND_URL` in `.env` is `http://localhost:5173`, which gets baked
directly into the receipt's QR code. "localhost" on whichever device scans
the code means *that device*, not the server, so it can never resolve —
this isn't something the PDF itself can fix. Added prominent comments in
both `.env` and `.env.example` explaining this (use your machine's LAN IP
for local testing across devices, e.g. `http://192.168.1.23:5173`, or your
real deployed domain in production) and a startup console warning if
`FRONTEND_URL` still contains `localhost` while `NODE_ENV=production`.

## 9. Announcements couldn't be deleted (or edited) from the admin UI
The backend already fully supported `PUT` and `DELETE` on
`/admin/announcements/:id`, correctly permitted for both Super Admins and
Sub Admins with the `manageAnnouncements` permission — the admin
Announcements page simply never had a delete (or edit) button, and
`adminApi` had no methods to call those endpoints at all. Added both,
following the same "confirm before delete" pattern used on the Coupons
page.

## 10. Super Admin: view/modify Sub Admin & Trainer passwords
Passwords are stored as one-way bcrypt hashes — this is standard security
practice, and it means the *original* password genuinely cannot be
recovered or "viewed" by anyone, including a Super Admin, without
undermining the whole point of hashing. What's now available instead is a
**Set Password** action (key icon) on both the Sub Admins and Trainers
admin pages: a Super Admin can set a brand-new password for either account
at any time, either typing one or generating a strong random one with one
click, shown once with a copy button so it can be handed to that person
directly. The backend endpoints for this already existed
(`PUT /superadmin/sub-admins/:id/reset-password`,
`PUT /admin/users/:id/reset-password`) but had no server-side password
strength check and weren't wired up in the frontend at all — both gaps are
now fixed, and Sub Admin password resets are now written to the activity
log same as regular user resets already were.

## 11. Splash screen + loading effects on first load
Added a branded splash ("ASK IT Technologies") that shows for
about a second on first load, implemented in plain HTML/CSS/inline JS in
`index.html` rather than as a React component — this means it paints
instantly from the raw HTML response, before the JS bundle has even
downloaded, so there's no blank white flash on a slow connection. It fades
out smoothly (respects `prefers-reduced-motion`) once the app is ready, and
never reappears on client-side navigation (only on a real page load).

## 12. Cross-device responsiveness
Audited the existing layout system (Navbar mobile menu, dashboard sidebar
drawer, `DataTable`'s horizontal scroll on small screens, and the fluid
`container-page`/grid breakpoints already used throughout) — it was already
in solid shape. Tightened a few things: the viewport meta tag now caps
pinch-zoom sensibly instead of leaving it unset, added a `theme-color` for
mobile browser chrome, and added a defensive `overflow-x: hidden` on
`html`/`body` so no decorative absolutely-positioned element (hero blurs,
floating shapes) can ever introduce an unwanted horizontal scrollbar on a
phone or tablet.

## 13. No way for a student to actually pay a Super Admin's UPI QR code
The "Payment Accounts" admin screen (where a Super Admin uploads a UPI QR
code / bank details) only ever fed an internal admin tool for manually
recording payments — there was no student-facing screen anywhere that
displayed it. A student clicking "Register & Pay" only ever saw the
Razorpay checkout popup, with no way to choose UPI-QR/bank transfer
instead. Added:
- A "Pay Via" toggle on the internship page (Card/UPI/Netbanking via
  Razorpay vs. UPI QR / Bank Transfer), and a matching option on Payment
  History for retrying a pending/failed payment.
- A safe endpoint that exposes only the non-secret fields of active
  UPI/bank `PaymentAccount`s (never Razorpay credentials or a full account
  number) — `GET /payments/manual-accounts`.
- A `ManualPaymentModal` that shows the QR code and UPI ID (with a copy
  button) or bank details, and lets the student submit the UTR/transaction
  reference after paying.
- A new `Payment.studentReference` field, so that reference shows up right
  in Admin → Payments next to the "Mark Paid" action — an admin isn't left
  hunting blind through a bank statement to match a pending payment to a
  transfer.
- Submitting a reference also notifies every Super Admin/Sub Admin so
  nothing sits unnoticed.

Also worth noting: within the Razorpay checkout popup itself, UPI is
already offered as a payment method by default alongside Card/Netbanking/
Wallet — that's controlled by Razorpay's own dashboard settings for the
merchant account, not by this codebase, so if UPI is missing *inside* that
popup specifically, check Razorpay's dashboard → Settings → Payment
Methods.

## 14. "Receipt logged (SMTP not configured)" / "WhatsApp not configured"
This is not an error — it's a status message shown to an *admin* after
clicking "Resend Receipt", honestly reporting that `backend/.env` has no
SMTP or WhatsApp credentials configured, so the receipt (which is still
generated and downloadable either way) wasn't actually emailed or
WhatsApped. See `backend/.env.example` for the `SMTP_*` and WhatsApp
variables to fill in if real delivery is needed.

## 15. Admin → Users restructured into Students / Sub Admins / Trainers
Previously "Users" was one flat table mixing every role together, with no
way to drill into a person's full profile. Replaced it with a category hub:

- **Admin → Users** now shows three cards (Students, Sub Admins, Trainers —
  Sub Admins only visible to a Super Admin) with live counts.
- **Students**: list of every USER-role account (search, filter, create,
  activate/deactivate/delete unchanged from before) — click one to see
  everything they entered while setting up their account (contact info,
  DOB/gender, address, college/degree/branch/graduation year) plus their
  registrations and certificates, and an activate/deactivate action. Their
  internal ID and password are never shown — passwords are hashed and
  can't be, and the ID isn't something anyone needs to see.
- **Sub Admins**: list of Sub Admin accounts; clicking one jumps straight to
  Admin → Permissions with that Sub Admin pre-selected (Permissions now
  reads a `?subAdminId=` query param instead of always defaulting to the
  first one in the list).
- **Trainers**: a read-focused directory (full trainer management —
  create/edit/assign/delete — stays on the existing Admin → Trainers page,
  unchanged); clicking a trainer shows their qualification, tech
  stack/expertise, years of experience, availability, bio, and which
  internships they're currently assigned to.

Backend: added `GET /admin/trainers/:id` for the trainer detail view (the
student equivalent, `GET /admin/users/:id`, already existed). No existing
endpoints were changed.
