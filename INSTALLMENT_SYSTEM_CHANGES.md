# Installment Payment & Notification System — what changed

This build implements the full installment-payment approval workflow and
real-time/push notification system on top of the existing app. Read
`CHANGES.md` first for prior fixes; this file covers only this feature.

## Setup after unzipping

```bash
cd backend
npm install                 # pulls in socket.io, web-push (new deps)
npx prisma migrate deploy   # applies the new migration
npm run build && npm start  # or npm run dev

cd ../frontend
npm install                 # pulls in socket.io-client
npm run dev
```

Optional — enable push notifications (students get reminders even when the
site isn't open):
```bash
cd backend
npx web-push generate-vapid-keys
# paste the output into VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY in backend/.env
```
Everything else (installments, approvals, the real-time bell) works
without this — push is purely additive and no-ops safely if unconfigured.

---

## 1. Installment approval workflow (requirements 1, 3–9, 15)

Every installment/manual payment now has a `PENDING_APPROVAL` status
between "student paid" and "counted as Paid":

- **Online gateway** (Card/UPI/Netbanking via Razorpay): the gateway
  signature is still cryptographically verified as before, but for
  installment payments the payment is now set to `PENDING_APPROVAL`
  instead of `SUCCESS`. A Super Admin must approve it before it's
  credited, a receipt is issued, or (for the first installment) the
  student is enrolled.
- **UPI QR / Bank Transfer** (manual): submitting a reference number now
  moves the payment straight to `PENDING_APPROVAL` (previously it stayed
  `PENDING` with just a note attached).
- **Full (non-installment) online payments** are unchanged — they still
  auto-confirm on signature verification, since requirement 5 is scoped to
  installments and this avoids destabilizing the existing, already-tested
  full-payment flow.
- Admin → Payments now has **Approve** / **Reject** actions for any
  `PENDING_APPROVAL` row (`POST /api/admin/payments/:id/approve|reject`).
  Approving runs the same receipt-generation + registration-confirmation
  logic that used to run immediately; rejecting records a reason the
  student can see and leaves the registration untouched so they can retry.
- The legacy "Mark Paid" offline-settlement path (for cash / payments an
  admin collects directly) is unchanged — the admin *is* the approver in
  that case, so no separate approval step is needed.

**Full installment schedule is now created up front.** Previously only
installment #1 existed as a `Payment` row; installments 2..N were created
lazily whenever the student happened to click to pay them, with a due date
of "today." Now all `N` `Payment` rows are created at checkout time, each
due 30 days apart, so the complete schedule (all due dates, "next
installment," upcoming reminders) is accurate from day one — not just
after the student has manually triggered every installment at least once.

## 2. Installment schedule visibility (requirement 2, 7, 8)

- `GET /api/payments/installments/my` now returns each installment
  annotated with a `displayStatus`: `PAID`, `PENDING_APPROVAL`, `DUE`,
  `UPCOMING`, `OVERDUE`, or `FAILED` — plus plan-level `paidAmount`,
  `remainingAmount`, and `nextInstallment`.
- **My Internships** (`/my-internships`) shows, per registration with an
  installment plan: total fee, paid amount, remaining amount, the next
  installment's amount + due date with a Pay Now / UPI-Bank button, and an
  expandable full schedule with per-installment status + dates.
- **Payment History** shows a `Pending Approval` state (with the submitted
  UTR/reference) and, for rejected payments, the Super Admin's rejection
  reason.
- **Admin → Payments** shows an "Awaiting Approval" stat card, a status
  filter, the submitted reference inline, and Approve/Reject buttons.

## 3. Notifications (requirements 10–14)

- `backend/src/services/notify.service.ts` is the single entry point
  (`notifyUser` / `notifyUsers` / `notifyAdmins`) every part of the app now
  goes through — it writes to the DB, emits a real-time Socket.IO event,
  and best-effort sends a web push, so no notification type can forget one
  of the three channels.
- Auto-generated for: payment submitted, payment approved/rejected,
  successful payment, all-installments-completed, and upcoming/due/overdue
  reminders (`backend/src/services/reminder.service.ts`, swept every 6h,
  de-duplicated per day per payment via `Payment.lastReminderSentAt`).
- **Real-time bell**: `backend/src/services/realtime.service.ts` adds a
  JWT-authenticated Socket.IO layer; the frontend's `notificationStore`
  connects on login and a new `NotificationBell` component (unread count,
  dropdown, Mark all read, click-to-navigate via a new `Notification.link`
  field) is wired into every dashboard's header.
- Announcements from Super Admin/Admin (global) and Trainers
  (per-internship) now flow through the same notify service, so they show
  up as real-time + push notifications for the relevant students, not just
  a DB row picked up on next page load.
- **Push notifications**: `backend/src/services/push.service.ts` (VAPID
  web-push), a `PushSubscription` model, `/api/notifications/push/*`
  endpoints, a frontend service worker (`frontend/public/sw.js`), and an
  enable/disable toggle on the Notifications page. Entirely optional —
  everything else works with it left unconfigured.
- In-app and push never duplicate: the bell already updates instantly for
  an open tab via the socket event; push is a separate, independent
  best-effort delivery so an off-site user still gets *something*, not a
  second copy of what an online user already saw.

## Database changes

New migration:
`backend/prisma/migrations/20260814000000_installment_approval_and_notifications/`
- `PaymentStatus` gains `PENDING_APPROVAL`.
- `NotificationType` gains `PAYMENT`.
- `Payment` gains `approvedById`, `approvedAt`, `rejectionReason`,
  `lastReminderSentAt`.
- `Notification` gains `link`.
- New `PushSubscription` table.

## Known scope notes

- Push notifications require the operator to generate and configure VAPID
  keys; without them the feature simply stays off (no errors).
- Because this sandbox has no network access, `npm install` /
  `prisma generate` / a full `tsc` build could not be run here — every new
  and edited file was manually checked for balanced syntax and cross-
  checked with `tsc --noEmit` (ignoring only the errors caused by the
  absent `node_modules`, which affect the *entire* pre-existing codebase
  identically). Please run `npm install` and a normal build as the first
  step after unzipping.
