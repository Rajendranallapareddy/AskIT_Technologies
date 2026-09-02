import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

const storage = new Storage();

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

const NAVY = '#123f8f';
const DEEP_NAVY = '#0b2868';
const BLUE = '#0d6efd';
const ORANGE = '#f97316';
const LIGHT_ORANGE = '#fff7ed';
const TEXT = '#111827';
const MUTED = '#6b7280';
const BORDER = '#dbe3ef';
const LIGHT_BLUE = '#eff6ff';

const money = (n: number) =>
  `INR ${Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function getBucket() {
  const bucketName = process.env.GCS_BUCKET_NAME?.trim();

  if (!bucketName) {
    throw new Error('GCS_BUCKET_NAME is not configured');
  }

  return storage.bucket(bucketName);
}

function getLogoPath(): string {
  const candidates = [
    path.join(process.cwd(), 'assets', 'askit-logo.jpeg'),
    path.join(process.cwd(), 'assets', 'askit-logo.jpg'),
    path.join(process.cwd(), 'assets', 'askit-logo.png'),
  ];

  const found = candidates.find((candidate) => fs.existsSync(candidate));

  if (!found) {
    throw new Error(
      'AskIT receipt logo was not found. Add the logo to backend/assets/askit-logo.jpeg'
    );
  }

  return found;
}

function safeDate(date: Date) {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function createReceiptPdfBuffer(data: ReceiptData): Promise<Buffer> {
  const frontendUrl =
    process.env.FRONTEND_URL?.replace(/\/+$/, '') ||
    'http://localhost:5173';

  const verifyUrl =
    `${frontendUrl}/verify-receipt/${encodeURIComponent(data.verifyToken)}`;

  if (
    /localhost|127\.0\.0\.1/.test(verifyUrl) &&
    process.env.NODE_ENV === 'production'
  ) {
    console.warn(
      `[receipt.service] FRONTEND_URL is "${process.env.FRONTEND_URL}" in production. ` +
        'Receipt QR verification will not work publicly.'
    );
  }

  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 220,
    errorCorrectionLevel: 'M',
  });

  const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
  const logoPath = getLogoPath();

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: {
        Title: `AskIT Technologies Receipt ${data.receiptNo}`,
        Author: 'AskIT Technologies',
        Subject: 'Payment Receipt',
      },
    });

    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const left = 42;
    const right = pageWidth - 42;
    const contentWidth = right - left;

    // ---------------------------------------------------------------------
    // HEADER
    // ---------------------------------------------------------------------

    doc.image(logoPath, left, 30, {
      fit: [105, 94],
      align: 'center',
      valign: 'center',
    });

    doc
      .font('Helvetica-Bold')
      .fontSize(24)
      .fillColor(DEEP_NAVY)
      .text('AskIT', 155, 45, { continued: true })
      .fillColor(ORANGE)
      .text(' Technologies');

    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(MUTED)
      .text('LEARN TODAY  |  GROW TOMORROW  |  SUCCEED ALWAYS', 156, 76);

    doc
      .fontSize(9)
      .fillColor(TEXT)
      .text('info@askittechnologies.com', 156, 96);

    doc
      .font('Helvetica-Bold')
      .fontSize(19)
      .fillColor(ORANGE)
      .text('PAYMENT RECEIPT', 365, 42, {
        width: 188,
        align: 'right',
      });

    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor(TEXT)
      .text('Receipt No:', 373, 80, {
        width: 70,
        align: 'right',
      });

    doc
      .font('Helvetica')
      .text(data.receiptNo, 448, 80, {
        width: 105,
        align: 'right',
      });

    doc
      .font('Helvetica-Bold')
      .text('Date:', 373, 97, {
        width: 70,
        align: 'right',
      });

    doc
      .font('Helvetica')
      .text(safeDate(data.paidAt), 448, 97, {
        width: 105,
        align: 'right',
      });

    doc
      .moveTo(left, 132)
      .lineTo(right, 132)
      .lineWidth(1.5)
      .strokeColor(NAVY)
      .stroke();

    // ---------------------------------------------------------------------
    // BILLED TO / PROGRAM
    // ---------------------------------------------------------------------

    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .fillColor(NAVY)
      .text('BILLED TO', left, 153);

    doc
      .font('Helvetica-Bold')
      .fontSize(11.5)
      .fillColor(TEXT)
      .text(data.studentName, left, 177, {
        width: 240,
      });

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#374151')
      .text(data.studentEmail, left, 198, {
        width: 240,
      });

    doc
      .moveTo(296, 151)
      .lineTo(296, 222)
      .lineWidth(0.7)
      .strokeColor(BORDER)
      .stroke();

    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .fillColor(NAVY)
      .text('PROGRAM', 322, 153);

    doc
      .font('Helvetica-Bold')
      .fontSize(11.5)
      .fillColor(TEXT)
      .text(data.internshipTitle, 322, 177, {
        width: 230,
        lineGap: 2,
      });

    doc
      .font('Helvetica')
      .fontSize(8.8)
      .fillColor(MUTED)
      .text('Course / Internship Program', 322, 212, {
        width: 230,
      });

    // ---------------------------------------------------------------------
    // FEE TABLE
    // ---------------------------------------------------------------------

    const tableTop = 250;

    doc
      .roundedRect(left, tableTop, contentWidth, 30, 5)
      .fill(NAVY);

    doc
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor('#ffffff')
      .text('DESCRIPTION', left + 12, tableTop + 10);

    doc.text('AMOUNT (INR)', right - 115, tableTop + 10, {
      width: 103,
      align: 'right',
    });

    let rowY = tableTop + 47;

    const drawRow = (
      label: string,
      value: string,
      options?: { valueColor?: string; bold?: boolean }
    ) => {
      doc
        .font(options?.bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(9.5)
        .fillColor(TEXT)
        .text(label, left + 8, rowY);

      doc
        .font(options?.bold ? 'Helvetica-Bold' : 'Helvetica')
        .fillColor(options?.valueColor || TEXT)
        .text(value, right - 145, rowY, {
          width: 137,
          align: 'right',
        });

      rowY += 27;

      doc
        .moveTo(left + 6, rowY - 9)
        .lineTo(right - 6, rowY - 9)
        .dash(1.2, { space: 2 })
        .lineWidth(0.5)
        .strokeColor('#cbd5e1')
        .stroke()
        .undash();
    };

    drawRow('Course / Internship Fee', money(data.baseAmount));

    if (data.discountAmount > 0) {
      drawRow(
        'Discount',
        `- ${money(data.discountAmount)}`,
        { valueColor: '#dc2626' }
      );
    }

    if (data.taxAmount > 0) {
      drawRow(
        `GST (${Number(data.gstPercentage || 0).toFixed(0)}%)`,
        money(data.taxAmount)
      );
    }

    // ---------------------------------------------------------------------
    // AMOUNT PAID BAND
    // ---------------------------------------------------------------------

    rowY += 6;

    doc
      .roundedRect(left, rowY, contentWidth, 54, 6)
      .lineWidth(1)
      .strokeColor(ORANGE)
      .fillAndStroke(LIGHT_ORANGE, ORANGE);

    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor('#c2410c')
      .text('AMOUNT PAID', left + 15, rowY + 18);

    doc
      .font('Helvetica-Bold')
      .fontSize(21)
      .fillColor('#c2410c')
      .text(money(data.totalAmount), 310, rowY + 14, {
        width: 235,
        align: 'right',
      });

    // ---------------------------------------------------------------------
    // PAYMENT DETAILS + QR VERIFY
    // ---------------------------------------------------------------------

    const detailsTop = rowY + 82;

    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .fillColor(NAVY)
      .text('PAYMENT DETAILS', left, detailsTop);

    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .fillColor(NAVY)
      .text('VERIFY THIS RECEIPT', 322, detailsTop);

    const labelX = left + 7;
    const valueX = 165;
    let detailsY = detailsTop + 28;

    const detailRow = (label: string, value: string) => {
      doc
        .font('Helvetica')
        .fontSize(8.8)
        .fillColor(MUTED)
        .text(label, labelX, detailsY, { width: 110 });

      doc
        .font('Helvetica-Bold')
        .fillColor(TEXT)
        .text(value || 'N/A', valueX, detailsY, {
          width: 116,
          align: 'right',
        });

      detailsY += 32;

      doc
        .moveTo(labelX, detailsY - 12)
        .lineTo(281, detailsY - 12)
        .lineWidth(0.5)
        .strokeColor(BORDER)
        .stroke();
    };

    detailRow('Payment Method', data.method || 'N/A');
    detailRow('Transaction ID', data.gatewayPaymentId || 'N/A');
    detailRow('Payment Date', safeDate(data.paidAt));

    doc
      .moveTo(296, detailsTop - 3)
      .lineTo(296, detailsY - 5)
      .lineWidth(0.7)
      .strokeColor(BORDER)
      .stroke();

    doc
      .roundedRect(322, detailsTop + 24, 102, 102, 4)
      .lineWidth(0.8)
      .strokeColor('#94a3b8')
      .stroke();

    doc.image(qrBuffer, 328, detailsTop + 30, {
      width: 90,
      height: 90,
    });

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(TEXT)
      .text(
        'Scan to verify this receipt online or visit:',
        438,
        detailsTop + 30,
        { width: 115 }
      );

    doc
      .font('Helvetica')
      .fontSize(7.2)
      .fillColor(BLUE)
      .text(verifyUrl, 438, detailsTop + 55, {
        width: 115,
        lineGap: 1,
      });

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(TEXT)
      .text('Verification Code:', 438, detailsTop + 96, {
        width: 115,
      });

    doc
      .font('Helvetica')
      .fontSize(7.1)
      .fillColor(NAVY)
      .text(data.verifyToken, 438, detailsTop + 109, {
        width: 115,
      });

    // ---------------------------------------------------------------------
    // LEGAL NOTE / SIGNATURE
    // ---------------------------------------------------------------------

    const noteTop = Math.min(detailsY + 20, 700);

    doc
      .moveTo(left, noteTop)
      .lineTo(right, noteTop)
      .dash(1.5, { space: 2 })
      .lineWidth(0.7)
      .strokeColor(NAVY)
      .stroke()
      .undash();

    doc
      .roundedRect(left, noteTop + 20, 18, 18, 9)
      .fill(LIGHT_BLUE);

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(NAVY)
      .text('i', left + 7, noteTop + 24);

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#475569')
      .text(
        'This is a system-generated receipt and does not require a physical signature.\n' +
          'For any billing queries, contact info@askittechnologies.com.',
        left + 28,
        noteTop + 20,
        {
          width: 330,
          lineGap: 2,
        }
      );

    doc
      .moveTo(410, noteTop + 40)
      .lineTo(right, noteTop + 40)
      .lineWidth(0.8)
      .strokeColor(TEXT)
      .stroke();

    doc
      .font('Helvetica-Bold')
      .fontSize(8.7)
      .fillColor(NAVY)
      .text('Authorized Signatory', 410, noteTop + 48, {
        width: right - 410,
        align: 'center',
      });

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(TEXT)
      .text('AskIT Technologies', 410, noteTop + 61, {
        width: right - 410,
        align: 'center',
      });

    // ---------------------------------------------------------------------
    // BOTTOM THANK-YOU STRIP
    // ---------------------------------------------------------------------

    doc
      .rect(0, pageHeight - 34, pageWidth, 34)
      .fill(NAVY);

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#ffffff')
      .text(
        'Thank you for choosing AskIT Technologies!',
        0,
        pageHeight - 22,
        {
          width: pageWidth,
          align: 'center',
        }
      );

    doc.end();
  });
}

/**
 * Generates a permanent PDF and stores it privately in Google Cloud Storage.
 *
 * Stored database value:
 * receipts/ASKIT-RCPT-....pdf
 */
export async function generateReceiptPdf(
  data: ReceiptData
): Promise<string> {
  const pdfBuffer = await createReceiptPdfBuffer(data);

  const objectPath = `receipts/${data.receiptNo}.pdf`;
  const cloudFile = getBucket().file(objectPath);

  await cloudFile.save(pdfBuffer, {
    resumable: false,
    metadata: {
      contentType: 'application/pdf',
      cacheControl: 'private, max-age=3600',
      contentDisposition: `attachment; filename="${data.receiptNo}.pdf"`,
    },
  });

  console.log(`[RECEIPT] Uploaded ${objectPath} to Cloud Storage`);

  return objectPath;
}

/**
 * Generates a temporary secure download URL for a private receipt.
 */
export async function getReceiptSignedUrl(
  objectPath: string
): Promise<string> {
  if (!objectPath) {
    throw new Error('Receipt object path is missing');
  }

  if (
    objectPath.startsWith('http://') ||
    objectPath.startsWith('https://')
  ) {
    return objectPath;
  }

  if (objectPath.startsWith('/uploads/')) {
    throw new Error('LEGACY_LOCAL_RECEIPT');
  }

  const fileName = objectPath.split('/').pop() || 'receipt.pdf';

  const [signedUrl] = await getBucket()
    .file(objectPath)
    .getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000,
      responseDisposition: `attachment; filename="${fileName}"`,
    });

  return signedUrl;
}
