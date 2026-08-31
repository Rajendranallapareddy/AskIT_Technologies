import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

const RECEIPT_DIR = path.join(process.cwd(), 'uploads', 'receipts');
if (!fs.existsSync(RECEIPT_DIR)) fs.mkdirSync(RECEIPT_DIR, { recursive: true });

interface ReceiptData {
  receiptNo: string;
  verifyToken: string;
  studentName: string;
  studentEmail: string;
  internshipTitle: string;
  baseAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  gstPercentage: number;
  method: string | null;
  gatewayPaymentId: string | null;
  paidAt: Date;
}

const CURRENCY = (n: number) => `Rs. ${n.toFixed(2)}`;

// Generates a branded PDF receipt with an embedded QR code that links to the
// public verification page (/verify-receipt/:token) — anyone can scan it to
// confirm the receipt is genuine without needing an account.
//
// NOTE on the QR code being unreachable: it encodes FRONTEND_URL from the
// backend's .env. If that's still "http://localhost:5173" (the default),
// the QR will resolve to "localhost" on whatever device scans it — which
// means someone else's phone, not the server — so it will always look like
// a broken link. This isn't something the PDF itself can fix; FRONTEND_URL
// needs to be set to a real, publicly reachable URL (your deployed domain,
// or your machine's LAN IP for local testing) before receipts are handed
// out. See SETUP_GUIDE.md. The verification link is also printed as plain
// text below the QR so it's still usable if scanning ever fails.
export async function generateReceiptPdf(data: ReceiptData): Promise<string> {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-receipt/${data.verifyToken}`;
  if (/localhost|127\.0\.0\.1/.test(verifyUrl) && process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.warn(
      `[receipt.service] FRONTEND_URL is "${process.env.FRONTEND_URL}" in production — the QR code on every ` +
        'receipt will be unreachable from a student\'s phone. Set FRONTEND_URL to your real deployed domain.'
    );
  }
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 160 });
  const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

  const fileName = `${data.receiptNo}.pdf`;
  const filePath = path.join(RECEIPT_DIR, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc.fontSize(22).fillColor('#1e3a8a').font('Helvetica-Bold').text('ASK IT Technologies', 50, 50);
    // doc.fontSize(10).fillColor('#666').font('Helvetica').text('Hyderabad, Telangana, India', 50, 78);
    doc.text('info@askittechnologies.com', 50, 92);

    doc.fontSize(16).fillColor('#f97316').font('Helvetica-Bold').text('PAYMENT RECEIPT', 400, 50, { align: 'right' });
    doc.fontSize(9).fillColor('#666').font('Helvetica').text(`Receipt No: ${data.receiptNo}`, 400, 74, { align: 'right' });
    doc.text(`Date: ${data.paidAt.toLocaleString('en-IN')}`, 400, 87, { align: 'right' });

    doc.moveTo(50, 115).lineTo(545, 115).strokeColor('#e2e8f0').stroke();

    // Bill-to
    doc.fontSize(11).fillColor('#111').font('Helvetica-Bold').text('Billed To', 50, 130);
    doc.fontSize(10).fillColor('#333').font('Helvetica').text(data.studentName, 50, 148);
    doc.text(data.studentEmail, 50, 163);

    doc.fontSize(11).fillColor('#111').font('Helvetica-Bold').text('Program', 300, 130);
    doc.fontSize(10).fillColor('#333').font('Helvetica').text(data.internshipTitle, 300, 148, { width: 245 });

    // Amount table. Everything below this point is laid out strictly
    // top-to-bottom, accumulating into `y` — nothing is ever positioned by
    // subtracting from a later `y` to jump back up a page, which is what
    // previously made the QR code land on top of the "Amount Paid" band.
    let y = 210;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#e2e8f0').stroke();
    y += 15;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#111');
    doc.text('Description', 50, y);
    doc.text('Amount', 450, y, { width: 95, align: 'right' });
    y += 20;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#e2e8f0').stroke();
    y += 12;

    doc.font('Helvetica').fillColor('#333');
    const row = (label: string, value: string, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');
      doc.text(label, 50, y);
      doc.text(value, 450, y, { width: 95, align: 'right' });
      y += 20;
    };

    row('Course / Internship Fee', CURRENCY(data.baseAmount));
    if (data.discountAmount > 0) row('Discount', `- ${CURRENCY(data.discountAmount)}`);
    if (data.taxAmount > 0) row(`GST (${data.gstPercentage}%)`, CURRENCY(data.taxAmount));

    y += 10;

    // "Amount Paid" is the single number the student actually cares about —
    // give it its own highlighted band, full width, with nothing else ever
    // drawn inside its vertical span.
    const bandHeight = 44;
    doc.rect(50, y, 495, bandHeight).fill('#fff7ed');
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#9a3412').text('AMOUNT PAID', 66, y + 15);
    doc.fontSize(19).font('Helvetica-Bold').fillColor('#c2410c').text(CURRENCY(data.totalAmount), 280, y + 11, { width: 249, align: 'right' });
    y += bandHeight + 22;

    // Payment meta (left column) — reserve the right-hand column for the QR
    // block below, so this text never has to share horizontal space with it.
    doc.fontSize(9).fillColor('#666').font('Helvetica');
    doc.text(`Payment Method: ${data.method || 'N/A'}`, 50, y, { width: 340 });
    y += 14;
    doc.text(`Transaction Reference: ${data.gatewayPaymentId || 'N/A'}`, 50, y, { width: 340 });
    y += 14;
    doc.text(`Paid On: ${data.paidAt.toLocaleString('en-IN')}`, 50, y, { width: 340 });
    const metaBottom = y + 14;

    // QR code + verification — its own clear block, positioned only using
    // the y that's already been consumed above (never subtracted from it),
    // so it can never overlap the amount band or the meta text.
    const qrTop = metaBottom + 16;
    doc.image(qrBuffer, 50, qrTop, { width: 80, height: 80 });
    doc.fontSize(8).fillColor('#999').font('Helvetica')
      .text('Scan to verify this receipt online, or visit:', 140, qrTop + 6, { width: 405 });
    doc.fontSize(8).fillColor('#2563eb').font('Helvetica')
      .text(verifyUrl, 140, qrTop + 20, { width: 405 });
    doc.fontSize(8).fillColor('#999').font('Helvetica')
      .text(`Verification code: ${data.verifyToken}`, 140, qrTop + 38, { width: 405 });
    y = qrTop + 80 + 20;

    // Footer — pinned near the bottom of the page, well clear of the QR
    // block above for any receipt with a normal amount of content.
    const footerTop = Math.max(y, 730);
    doc.moveTo(50, footerTop - 12).lineTo(545, footerTop - 12).strokeColor('#e2e8f0').stroke();
    doc.fontSize(8).fillColor('#999').text(
      'This is a system-generated receipt and does not require a physical signature. ' +
        'For any billing queries, contact info@askittechnologies.com.',
      50,
      footerTop,
      { width: 495, align: 'center' }
    );
    doc.text('Authorized Signatory — ASK IT Technologies', 50, footerTop + 16, { width: 495, align: 'right' });

    doc.end();
    stream.on('finish', () => resolve(`/uploads/receipts/${fileName}`));
    stream.on('error', reject);
  });
}
