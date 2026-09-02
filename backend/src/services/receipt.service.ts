import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Storage } from '@google-cloud/storage';

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

const CURRENCY = (n: number) => `Rs. ${Number(n).toFixed(2)}`;

function getBucket() {
  const bucketName = process.env.GCS_BUCKET_NAME?.trim();

  if (!bucketName) {
    throw new Error('GCS_BUCKET_NAME is not configured');
  }

  return storage.bucket(bucketName);
}

/**
 * Creates the receipt PDF completely in memory.
 *
 * Nothing is written to Cloud Run's local filesystem because Cloud Run
 * storage is temporary and can disappear whenever an instance restarts.
 */
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
      `[receipt.service] FRONTEND_URL is "${process.env.FRONTEND_URL}" ` +
        'in production. Receipt QR verification will not work publicly.'
    );
  }

  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 160,
  });

  const qrBuffer = Buffer.from(
    qrDataUrl.split(',')[1],
    'base64'
  );

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
    });

    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    doc.on('error', reject);

    // -------------------------------------------------------------
    // HEADER
    // -------------------------------------------------------------

    doc
      .fontSize(22)
      .fillColor('#1e3a8a')
      .font('Helvetica-Bold')
      .text('AskIT Technologies', 50, 50);

    doc
      .fontSize(10)
      .fillColor('#666')
      .font('Helvetica')
      .text('info@askittechnologies.com', 50, 92);

    doc
      .fontSize(16)
      .fillColor('#f97316')
      .font('Helvetica-Bold')
      .text('PAYMENT RECEIPT', 350, 50, {
        width: 195,
        align: 'right',
      });

    doc
      .fontSize(9)
      .fillColor('#666')
      .font('Helvetica')
      .text(
        `Receipt No: ${data.receiptNo}`,
        350,
        74,
        {
          width: 195,
          align: 'right',
        }
      );

    doc.text(
      `Date: ${data.paidAt.toLocaleString('en-IN')}`,
      350,
      87,
      {
        width: 195,
        align: 'right',
      }
    );

    doc
      .moveTo(50, 115)
      .lineTo(545, 115)
      .strokeColor('#e2e8f0')
      .stroke();

    // -------------------------------------------------------------
    // BILLED TO / PROGRAM
    // -------------------------------------------------------------

    doc
      .fontSize(11)
      .fillColor('#111')
      .font('Helvetica-Bold')
      .text('Billed To', 50, 130);

    doc
      .fontSize(10)
      .fillColor('#333')
      .font('Helvetica')
      .text(data.studentName, 50, 148);

    doc.text(data.studentEmail, 50, 163);

    doc
      .fontSize(11)
      .fillColor('#111')
      .font('Helvetica-Bold')
      .text('Program', 300, 130);

    doc
      .fontSize(10)
      .fillColor('#333')
      .font('Helvetica')
      .text(data.internshipTitle, 300, 148, {
        width: 245,
      });

    // -------------------------------------------------------------
    // AMOUNT TABLE
    // -------------------------------------------------------------

    let y = 210;

    doc
      .moveTo(50, y)
      .lineTo(545, y)
      .strokeColor('#e2e8f0')
      .stroke();

    y += 15;

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#111');

    doc.text('Description', 50, y);

    doc.text('Amount', 450, y, {
      width: 95,
      align: 'right',
    });

    y += 20;

    doc
      .moveTo(50, y)
      .lineTo(545, y)
      .strokeColor('#e2e8f0')
      .stroke();

    y += 12;

    doc
      .font('Helvetica')
      .fillColor('#333');

    const row = (
      label: string,
      value: string,
      bold = false
    ) => {
      doc.font(
        bold ? 'Helvetica-Bold' : 'Helvetica'
      );

      doc.text(label, 50, y);

      doc.text(value, 450, y, {
        width: 95,
        align: 'right',
      });

      y += 20;
    };

    row(
      'Course / Internship Fee',
      CURRENCY(data.baseAmount)
    );

    if (data.discountAmount > 0) {
      row(
        'Discount',
        `- ${CURRENCY(data.discountAmount)}`
      );
    }

    if (data.taxAmount > 0) {
      row(
        `GST (${data.gstPercentage}%)`,
        CURRENCY(data.taxAmount)
      );
    }

    y += 10;

    // -------------------------------------------------------------
    // AMOUNT PAID
    // -------------------------------------------------------------

    const bandHeight = 44;

    doc
      .rect(50, y, 495, bandHeight)
      .fill('#fff7ed');

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#9a3412')
      .text('AMOUNT PAID', 66, y + 15);

    doc
      .fontSize(19)
      .font('Helvetica-Bold')
      .fillColor('#c2410c')
      .text(
        CURRENCY(data.totalAmount),
        280,
        y + 11,
        {
          width: 249,
          align: 'right',
        }
      );

    y += bandHeight + 22;

    // -------------------------------------------------------------
    // PAYMENT DETAILS
    // -------------------------------------------------------------

    doc
      .fontSize(9)
      .fillColor('#666')
      .font('Helvetica');

    doc.text(
      `Payment Method: ${data.method || 'N/A'}`,
      50,
      y,
      {
        width: 340,
      }
    );

    y += 14;

    doc.text(
      `Transaction Reference: ${
        data.gatewayPaymentId || 'N/A'
      }`,
      50,
      y,
      {
        width: 340,
      }
    );

    y += 14;

    doc.text(
      `Paid On: ${data.paidAt.toLocaleString(
        'en-IN'
      )}`,
      50,
      y,
      {
        width: 340,
      }
    );

    const metaBottom = y + 14;

    // -------------------------------------------------------------
    // QR VERIFICATION
    // -------------------------------------------------------------

    const qrTop = metaBottom + 16;

    doc.image(qrBuffer, 50, qrTop, {
      width: 80,
      height: 80,
    });

    doc
      .fontSize(8)
      .fillColor('#999')
      .font('Helvetica')
      .text(
        'Scan to verify this receipt online, or visit:',
        140,
        qrTop + 6,
        {
          width: 405,
        }
      );

    doc
      .fontSize(8)
      .fillColor('#2563eb')
      .font('Helvetica')
      .text(
        verifyUrl,
        140,
        qrTop + 20,
        {
          width: 405,
        }
      );

    doc
      .fontSize(8)
      .fillColor('#999')
      .font('Helvetica')
      .text(
        `Verification code: ${data.verifyToken}`,
        140,
        qrTop + 38,
        {
          width: 405,
        }
      );

    y = qrTop + 100;

    // -------------------------------------------------------------
    // FOOTER
    // -------------------------------------------------------------

    const footerTop = Math.max(y, 730);

    doc
      .moveTo(50, footerTop - 12)
      .lineTo(545, footerTop - 12)
      .strokeColor('#e2e8f0')
      .stroke();

    doc
      .fontSize(8)
      .fillColor('#999')
      .text(
        'This is a system-generated receipt and does not require a physical signature. ' +
          'For any billing queries, contact info@askittechnologies.com.',
        50,
        footerTop,
        {
          width: 495,
          align: 'center',
        }
      );

    doc.text(
      'Authorized Signatory — AskIT Technologies',
      50,
      footerTop + 16,
      {
        width: 495,
        align: 'right',
      }
    );

    doc.end();
  });
}

/**
 * Generate receipt PDF and permanently store it in Google Cloud Storage.
 *
 * The DB stores an object path such as:
 * receipts/ASKIT-RCPT-2026-123456.pdf
 *
 * We intentionally do NOT store a signed URL in the DB because signed URLs
 * expire. A fresh signed URL is generated whenever a student downloads it.
 */
export async function generateReceiptPdf(
  data: ReceiptData
): Promise<string> {
  const pdfBuffer =
    await createReceiptPdfBuffer(data);

  const objectPath =
    `receipts/${data.receiptNo}.pdf`;

  const cloudFile =
    getBucket().file(objectPath);

  await cloudFile.save(pdfBuffer, {
    resumable: false,
    metadata: {
      contentType: 'application/pdf',
      cacheControl: 'private, max-age=3600',
      contentDisposition:
        `attachment; filename="${data.receiptNo}.pdf"`,
    },
  });

  console.log(
    `[RECEIPT] Uploaded ${objectPath} to Cloud Storage`
  );

  return objectPath;
}

/**
 * Generates a temporary secure URL for downloading a private receipt.
 */
export async function getReceiptSignedUrl(
  objectPath: string
): Promise<string> {
  if (!objectPath) {
    throw new Error('Receipt object path is missing');
  }

  // Already a complete URL — useful only for backwards compatibility.
  if (
    objectPath.startsWith('http://') ||
    objectPath.startsWith('https://')
  ) {
    return objectPath;
  }

  if (objectPath.startsWith('/uploads/')) {
    throw new Error(
      'LEGACY_LOCAL_RECEIPT'
    );
  }

  const [signedUrl] =
    await getBucket()
      .file(objectPath)
      .getSignedUrl({
        version: 'v4',
        action: 'read',

        // 1 hour
        expires:
          Date.now() +
          60 * 60 * 1000,

        responseDisposition:
          `attachment; filename="${objectPath
            .split('/')
            .pop()}"`,
      });

  return signedUrl;
}