import { prisma } from '../config/db';
import { notifyUser } from './notify.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const UPCOMING_WINDOW_DAYS = 3;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Scans every unpaid installment (or "pay later" full payment) with a due
// date and sends at most one reminder per payment per day: an "upcoming"
// nudge a few days out, a "due today" notice, and a "now overdue" notice
// once the date has passed — until it's paid/approved. Called on a
// recurring interval from index.ts and safe to call multiple times a day
// since lastReminderSentAt de-dupes same-day sends.
export async function runInstallmentReminderSweep() {
  const now = new Date();
  const today = startOfToday();
  const windowEnd = new Date(now.getTime() + UPCOMING_WINDOW_DAYS * DAY_MS);

  const duePayments = await prisma.payment.findMany({
    where: {
      dueDate: { not: null, lte: windowEnd },
      status: { in: ['PENDING', 'FAILED'] },
      OR: [{ lastReminderSentAt: null }, { lastReminderSentAt: { lt: today } }],
    },
    include: { user: true, internship: true },
  });

  for (const payment of duePayments) {
    if (!payment.dueDate) continue;
    const due = new Date(payment.dueDate);
    const label = payment.installmentIndex ? `Installment ${payment.installmentIndex}` : 'Your payment';
    let title: string;
    let message: string;

    if (due < today) {
      title = 'Installment Overdue';
      message = `${label} of ₹${payment.totalAmount} for "${payment.internship.title}" was due on ${due.toLocaleDateString('en-IN')} and is now overdue. Please pay as soon as possible to avoid disruption to your enrollment.`;
    } else if (due.getTime() <= today.getTime() + DAY_MS - 1) {
      title = 'Installment Due Today';
      message = `${label} of ₹${payment.totalAmount} for "${payment.internship.title}" is due today. Pay now from Payment History to stay on schedule.`;
    } else {
      const daysLeft = Math.ceil((due.getTime() - now.getTime()) / DAY_MS);
      title = 'Upcoming Installment Reminder';
      message = `${label} of ₹${payment.totalAmount} for "${payment.internship.title}" is due in ${daysLeft} day${daysLeft === 1 ? '' : 's'} (${due.toLocaleDateString('en-IN')}).`;
    }

    // Payment due-date reminders are exactly the kind of thing a student
    // may miss if they aren't actively on the site — worth reaching them
    // over WhatsApp/email as well as in-app + push.
    await notifyUser({ userId: payment.userId, type: 'PAYMENT', title, message, link: '/payment-history', whatsapp: true, email: true });
    await prisma.payment.update({ where: { id: payment.id }, data: { lastReminderSentAt: now } });
  }

  return duePayments.length;
}
