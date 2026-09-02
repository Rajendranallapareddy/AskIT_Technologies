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
const TEXT = '#111827';
const MUTED = '#64748b';
const BORDER = '#dbe3ef';
const LIGHT_BLUE = '#eff6ff';
const LIGHT_ORANGE = '#fff7ed';
const GREEN = '#15803d';

function money(value: number): string {
  return `INR ${Number(value || 0).toLocaleString(
    'en-IN',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function getBucket() {
  const bucketName =
    process.env.GCS_BUCKET_NAME?.trim();

  if (!bucketName) {
    throw new Error(
      'GCS_BUCKET_NAME is not configured'
    );
  }

  return storage.bucket(bucketName);
}

function getLogoPath(): string {
  const candidates = [
    path.join(
      process.cwd(),
      'assets',
      'askit-logo.jpeg'
    ),

    path.join(
      process.cwd(),
      'assets',
      'askit-logo.jpg'
    ),

    path.join(
      process.cwd(),
      'assets',
      'askit-logo.png'
    ),
  ];

  const found = candidates.find(
    (candidate) =>
      fs.existsSync(candidate)
  );

  if (!found) {
    throw new Error(
      'AskIT receipt logo not found. Add backend/assets/askit-logo.jpeg'
    );
  }

  return found;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );
}

function fitFontSize(
  doc: any,
  text: string,
  maxWidth: number,
  preferredSize: number,
  minimumSize: number
) {
  let size = preferredSize;

  while (size > minimumSize) {
    doc.fontSize(size);

    if (
      doc.widthOfString(text) <=
      maxWidth
    ) {
      return size;
    }

    size -= 0.5;
  }

  return minimumSize;
}

async function createReceiptPdfBuffer(
  data: ReceiptData
): Promise<Buffer> {
  const frontendUrl =
    process.env.FRONTEND_URL
      ?.trim()
      .replace(/\/+$/, '') ||
    'http://localhost:5173';

  const verifyUrl =
    `${frontendUrl}/verify-receipt/${encodeURIComponent(
      data.verifyToken
    )}`;

  const qrDataUrl =
    await QRCode.toDataURL(
      verifyUrl,
      {
        width: 240,
        margin: 1,
        errorCorrectionLevel: 'M',
      }
    );

  const qrBuffer =
    Buffer.from(
      qrDataUrl.split(',')[1],
      'base64'
    );

  const logoPath =
    getLogoPath();

  return new Promise<Buffer>(
    (resolve, reject) => {
      const doc =
        new PDFDocument({
          size: 'A4',
          margin: 0,

          info: {
            Title:
              `AskIT Technologies Receipt ${data.receiptNo}`,

            Author:
              'AskIT Technologies',

            Subject:
              'Payment Receipt',
          },
        });

      const chunks: Buffer[] = [];

      doc.on(
        'data',
        (chunk: Buffer) =>
          chunks.push(chunk)
      );

      doc.on(
        'end',
        () =>
          resolve(
            Buffer.concat(chunks)
          )
      );

      doc.on(
        'error',
        reject
      );

      const W = doc.page.width;
      const H = doc.page.height;

      const left = 34;
      const right = W - 34;

      const width =
        right - left;

      // ================================================================
      // BACKGROUND
      // ================================================================

      doc
        .rect(0, 0, W, H)
        .fill('#ffffff');

      // ================================================================
      // HEADER
      // ================================================================

      // Logo
      doc.image(
        logoPath,
        left,
        28,
        {
          fit: [92, 82],
          align: 'center',
          valign: 'center',
        }
      );

      // Company name
      doc
        .font('Helvetica-Bold')
        .fontSize(21)
        .fillColor(DEEP_NAVY)
        .text(
          'AskIT',
          138,
          38,
          {
            continued: true,
          }
        )
        .fillColor(ORANGE)
        .text(
          ' Technologies'
        );

      // Tagline
      doc
        .font('Helvetica')
        .fontSize(7.3)
        .fillColor(MUTED)
        .text(
          'LEARN TODAY  |  GROW TOMORROW  |  SUCCEED ALWAYS',
          139,
          70,
          {
            width: 245,
          }
        );

      // Email
      doc
        .font('Helvetica-Bold')
        .fontSize(7.7)
        .fillColor(TEXT)
        .text(
          'info@askittechnologies.com',
          139,
          91,
          {
            width: 225,
          }
        );

      // Receipt title - dedicated right section
      doc
        .font('Helvetica-Bold')
        .fontSize(16)
        .fillColor(ORANGE)
        .text(
          'PAYMENT',
          395,
          32,
          {
            width: 165,
            align: 'right',
          }
        );

      doc
        .font('Helvetica-Bold')
        .fontSize(16)
        .fillColor(ORANGE)
        .text(
          'RECEIPT',
          395,
          52,
          {
            width: 165,
            align: 'right',
          }
        );

      // Receipt number
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(TEXT)
        .text(
          'Receipt No:',
          398,
          82,
          {
            width: 60,
            align: 'right',
          }
        );

      const receiptNoSize =
        fitFontSize(
          doc,
          data.receiptNo,
          97,
          7.2,
          5.8
        );

      doc
        .font('Helvetica')
        .fontSize(receiptNoSize)
        .fillColor(TEXT)
        .text(
          data.receiptNo,
          464,
          82,
          {
            width: 96,
            align: 'right',
          }
        );

      // Date
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .text(
          'Date:',
          398,
          99,
          {
            width: 60,
            align: 'right',
          }
        );

      doc
        .font('Helvetica')
        .fontSize(6.8)
        .text(
          formatDate(
            data.paidAt
          ),
          464,
          99,
          {
            width: 96,
            align: 'right',
          }
        );

      doc
        .moveTo(
          left,
          132
        )
        .lineTo(
          right,
          132
        )
        .lineWidth(1.5)
        .strokeColor(NAVY)
        .stroke();

      // ================================================================
      // CUSTOMER / PROGRAM
      // ================================================================

      const infoTop = 158;

      doc
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor(NAVY)
        .text(
          'BILLED TO',
          left,
          infoTop
        );

      doc
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .fillColor(TEXT)
        .text(
          data.studentName,
          left,
          infoTop + 27,
          {
            width: 245,
          }
        );

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(MUTED)
        .text(
          data.studentEmail,
          left,
          infoTop + 50,
          {
            width: 245,
          }
        );

      // separator
      doc
        .moveTo(
          298,
          infoTop - 4
        )
        .lineTo(
          298,
          infoTop + 80
        )
        .lineWidth(0.6)
        .strokeColor(BORDER)
        .stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor(NAVY)
        .text(
          'PROGRAM',
          325,
          infoTop
        );

      const titleSize =
        fitFontSize(
          doc,
          data.internshipTitle,
          220,
          10.5,
          8.5
        );

      doc
        .font('Helvetica-Bold')
        .fontSize(titleSize)
        .fillColor(TEXT)
        .text(
          data.internshipTitle,
          325,
          infoTop + 27,
          {
            width: 220,
          }
        );

      doc
        .font('Helvetica')
        .fontSize(7.8)
        .fillColor(MUTED)
        .text(
          'Course / Internship Program',
          325,
          infoTop + 66,
          {
            width: 220,
          }
        );

      // ================================================================
      // PAYMENT TABLE
      // ================================================================

      const tableTop = 275;

      doc
        .roundedRect(
          left,
          tableTop,
          width,
          32,
          5
        )
        .fill(NAVY);

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#ffffff')
        .text(
          'DESCRIPTION',
          left + 14,
          tableTop + 11
        );

      doc.text(
        'AMOUNT (INR)',
        right - 145,
        tableTop + 11,
        {
          width: 132,
          align: 'right',
        }
      );

      let rowY =
        tableTop + 50;

      function drawMoneyRow(
        label: string,
        value: string,
        color: string = TEXT
      ) {
        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor(TEXT)
          .text(
            label,
            left + 8,
            rowY
          );

        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor(color)
          .text(
            value,
            right - 155,
            rowY,
            {
              width: 147,
              align: 'right',
            }
          );

        rowY += 27;

        doc
          .moveTo(
            left + 6,
            rowY - 8
          )
          .lineTo(
            right - 6,
            rowY - 8
          )
          .dash(1, {
            space: 2,
          })
          .lineWidth(0.4)
          .strokeColor(BORDER)
          .stroke()
          .undash();
      }

      drawMoneyRow(
        'Course / Internship Fee',
        money(
          data.baseAmount
        )
      );

      if (
        data.discountAmount > 0
      ) {
        drawMoneyRow(
          'Discount',
          `- ${money(
            data.discountAmount
          )}`,
          '#dc2626'
        );
      }

      if (
        data.taxAmount > 0
      ) {
        drawMoneyRow(
          `GST (${Number(
            data.gstPercentage || 0
          )}%)`,
          money(
            data.taxAmount
          )
        );
      }

      // ================================================================
      // TOTAL
      // ================================================================

      rowY += 5;

      doc
        .roundedRect(
          left,
          rowY,
          width,
          58,
          7
        )
        .lineWidth(1)
        .strokeColor(ORANGE)
        .fillAndStroke(
          LIGHT_ORANGE,
          ORANGE
        );

      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor('#c2410c')
        .text(
          'AMOUNT PAID',
          left + 15,
          rowY + 21
        );

      doc
        .font('Helvetica-Bold')
        .fontSize(20)
        .fillColor('#c2410c')
        .text(
          money(
            data.totalAmount
          ),
          295,
          rowY + 16,
          {
            width: 250,
            align: 'right',
          }
        );

      // ================================================================
      // PAYMENT DETAILS
      // ================================================================

      const detailTop =
        rowY + 87;

      doc
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor(NAVY)
        .text(
          'PAYMENT DETAILS',
          left,
          detailTop
        );

      let detailY =
        detailTop + 29;

      function detailRow(
        label: string,
        value: string
      ) {
        doc
          .font('Helvetica')
          .fontSize(7.8)
          .fillColor(MUTED)
          .text(
            label,
            left + 7,
            detailY,
            {
              width: 100,
            }
          );

        const valueSize =
          fitFontSize(
            doc,
            value,
            145,
            8,
            6.3
          );

        doc
          .font('Helvetica-Bold')
          .fontSize(valueSize)
          .fillColor(TEXT)
          .text(
            value,
            145,
            detailY,
            {
              width: 138,
              align: 'right',
            }
          );

        detailY += 31;

        doc
          .moveTo(
            left + 7,
            detailY - 11
          )
          .lineTo(
            283,
            detailY - 11
          )
          .lineWidth(0.5)
          .strokeColor(BORDER)
          .stroke();
      }

      detailRow(
        'Payment Method',
        data.method ||
          'N/A'
      );

      detailRow(
        'Transaction ID',
        data.gatewayPaymentId ||
          'N/A'
      );

      detailRow(
        'Payment Date',
        formatDate(
          data.paidAt
        )
      );

      // vertical separator
      doc
        .moveTo(
          302,
          detailTop - 3
        )
        .lineTo(
          302,
          detailY
        )
        .lineWidth(0.6)
        .strokeColor(BORDER)
        .stroke();

      // ================================================================
      // QR VERIFICATION
      // ================================================================

      doc
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor(NAVY)
        .text(
          'VERIFY THIS RECEIPT',
          328,
          detailTop
        );

      const qrX = 328;
      const qrY =
        detailTop + 28;

      doc
        .roundedRect(
          qrX,
          qrY,
          102,
          102,
          5
        )
        .lineWidth(0.7)
        .strokeColor('#94a3b8')
        .stroke();

      doc.image(
        qrBuffer,
        qrX + 6,
        qrY + 6,
        {
          width: 90,
          height: 90,
        }
      );

      doc
        .font('Helvetica-Bold')
        .fontSize(7.2)
        .fillColor(TEXT)
        .text(
          'Scan to verify',
          444,
          qrY + 6,
          {
            width: 105,
          }
        );

      doc
        .font('Helvetica')
        .fontSize(6.3)
        .fillColor(MUTED)
        .text(
          'Verify this payment receipt securely online.',
          444,
          qrY + 21,
          {
            width: 105,
            lineGap: 1,
          }
        );

      doc
        .font('Helvetica-Bold')
        .fontSize(6.8)
        .fillColor(NAVY)
        .text(
          'Verification Code',
          444,
          qrY + 57,
          {
            width: 105,
          }
        );

      doc
        .font('Helvetica')
        .fontSize(5.7)
        .fillColor(BLUE)
        .text(
          data.verifyToken,
          444,
          qrY + 73,
          {
            width: 105,
            lineGap: 1,
          }
        );

      // ================================================================
      // BOTTOM NOTE + SIGNATURE
      // ================================================================

      const footerY = 682;

      doc
        .moveTo(
          left,
          footerY
        )
        .lineTo(
          right,
          footerY
        )
        .dash(1.5, {
          space: 2,
        })
        .lineWidth(0.6)
        .strokeColor(NAVY)
        .stroke()
        .undash();

      doc
        .roundedRect(
          left,
          footerY + 20,
          18,
          18,
          9
        )
        .fill(LIGHT_BLUE);

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(NAVY)
        .text(
          'i',
          left + 7,
          footerY + 24
        );

      doc
        .font('Helvetica')
        .fontSize(7.3)
        .fillColor(MUTED)
        .text(
          'This is a system-generated payment receipt issued by AskIT Technologies.',
          left + 28,
          footerY + 20,
          {
            width: 305,
          }
        );

      doc
        .font('Helvetica')
        .fontSize(7.3)
        .fillColor(MUTED)
        .text(
          'For billing assistance: info@askittechnologies.com',
          left + 28,
          footerY + 34,
          {
            width: 305,
          }
        );

      // Signature style text
      doc
        .font('Times-Italic')
        .fontSize(16)
        .fillColor(DEEP_NAVY)
        .text(
          'AskIT Technologies',
          385,
          footerY + 11,
          {
            width: 165,
            align: 'center',
          }
        );

      doc
        .moveTo(
          397,
          footerY + 38
        )
        .lineTo(
          540,
          footerY + 38
        )
        .lineWidth(0.8)
        .strokeColor(TEXT)
        .stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(NAVY)
        .text(
          'Authorized Signatory',
          397,
          footerY + 45,
          {
            width: 143,
            align: 'center',
          }
        );

      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(TEXT)
        .text(
          'AskIT Technologies',
          397,
          footerY + 58,
          {
            width: 143,
            align: 'center',
          }
        );

      // ================================================================
      // STATUS
      // ================================================================

      doc
        .roundedRect(
          left,
          766,
          135,
          25,
          12
        )
        .fill('#dcfce7');

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(GREEN)
        .text(
          '✓ PAYMENT SUCCESSFUL',
          left,
          774,
          {
            width: 135,
            align: 'center',
          }
        );

      // Bottom bar
      doc
        .rect(
          0,
          H - 31,
          W,
          31
        )
        .fill(NAVY);

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#ffffff')
        .text(
          'Thank you for choosing AskIT Technologies!',
          0,
          H - 20,
          {
            width: W,
            align: 'center',
          }
        );

      doc.end();
    }
  );
}

export async function generateReceiptPdf(
  data: ReceiptData
): Promise<string> {
  const pdfBuffer =
    await createReceiptPdfBuffer(
      data
    );

  const objectPath =
    `receipts/${data.receiptNo}.pdf`;

  const cloudFile =
    getBucket().file(
      objectPath
    );

  await cloudFile.save(
    pdfBuffer,
    {
      resumable: false,

      metadata: {
        contentType:
          'application/pdf',

        cacheControl:
          'private, max-age=3600',

        contentDisposition:
          `attachment; filename="${data.receiptNo}.pdf"`,
      },
    }
  );

  console.log(
    `[RECEIPT] Uploaded ${objectPath} to Cloud Storage`
  );

  return objectPath;
}

export async function getReceiptSignedUrl(
  objectPath: string
): Promise<string> {
  if (!objectPath) {
    throw new Error(
      'Receipt object path is missing'
    );
  }

  if (
    objectPath.startsWith(
      'http://'
    ) ||
    objectPath.startsWith(
      'https://'
    )
  ) {
    return objectPath;
  }

  if (
    objectPath.startsWith(
      '/uploads/'
    )
  ) {
    throw new Error(
      'LEGACY_LOCAL_RECEIPT'
    );
  }

  const fileName =
    objectPath
      .split('/')
      .pop() ||
    'receipt.pdf';

  const [signedUrl] =
    await getBucket()
      .file(objectPath)
      .getSignedUrl({
        version: 'v4',
        action: 'read',

        expires:
          Date.now() +
          60 * 60 * 1000,

        responseDisposition:
          `attachment; filename="${fileName}"`,
      });

  return signedUrl;
}