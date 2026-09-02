import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

const storage = new Storage();

interface CertificateData {
  certificateNo: string;
  studentName: string;
  studentPhoto?: string | null;
  internshipTitle: string;
  duration: string;
  startDate: Date;
  endDate: Date;
  trainerName?: string | null;
  issuedDate: Date;
}

const NAVY = '#0b2868';
const NAVY_2 = '#123f8f';
const BLUE = '#0d6efd';
const GOLD = '#c8952c';
const GOLD_LIGHT = '#e9bd58';
const ORANGE = '#f97316';
const TEXT = '#111827';
const MUTED = '#5b6474';
const PAPER = '#fffefb';
const BORDER = '#e5d7b4';

function getBucket() {
  const bucketName = process.env.GCS_BUCKET_NAME?.trim();

  if (!bucketName) {
    throw new Error('GCS_BUCKET_NAME is not configured');
  }

  return storage.bucket(bucketName);
}

function findAsset(...names: string[]): string | null {
  for (const name of names) {
    const candidate = path.join(process.cwd(), 'assets', name);

    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function requireAskITLogo(): string {
  const logo = findAsset(
    'askit-logo.jpeg',
    'askit-logo.jpg',
    'askit-logo.png'
  );

  if (!logo) {
    throw new Error(
      'AskIT logo not found. Add it as backend/assets/askit-logo.jpeg'
    );
  }

  return logo;
}

function formatDate(value: Date): string {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function fitText(
  doc: PDFKit.PDFDocument,
  text: string,
  maxWidth: number,
  preferredSize: number,
  minimumSize: number
): number {
  let size = preferredSize;

  while (size > minimumSize) {
    doc.fontSize(size);

    if (doc.widthOfString(text) <= maxWidth) {
      return size;
    }

    size -= 1;
  }

  return minimumSize;
}

async function loadStudentPhoto(
  photo?: string | null
): Promise<Buffer | null> {
  if (!photo) return null;

  try {
    // Current profile-picture implementation stores
    // a private GCS object path.
    if (
      !photo.startsWith('http://') &&
      !photo.startsWith('https://') &&
      !photo.startsWith('/uploads/')
    ) {
      const [buffer] = await getBucket()
        .file(photo)
        .download();

      return buffer;
    }

    // Signed/public URL.
    if (
      photo.startsWith('http://') ||
      photo.startsWith('https://')
    ) {
      const response = await fetch(photo);

      if (!response.ok) {
        return null;
      }

      return Buffer.from(
        await response.arrayBuffer()
      );
    }

    // Old /uploads profile images are not reliable
    // on Cloud Run.
    return null;
  } catch (error) {
    console.warn(
      '[CERTIFICATE] Could not load student photo:',
      error
    );

    return null;
  }
}

function drawCornerRibbons(
  doc: PDFKit.PDFDocument,
  W: number,
  H: number
) {
  doc.save();

  doc
    .polygon(
      [0, 0],
      [170, 0],
      [65, 92],
      [0, 152]
    )
    .fill(NAVY);

  doc
    .polygon(
      [88, 0],
      [145, 0],
      [32, 118],
      [0, 143],
      [0, 115]
    )
    .fill(NAVY_2);

  doc
    .polygon(
      [147, 0],
      [169, 0],
      [22, 145],
      [0, 160],
      [0, 142]
    )
    .fill(GOLD_LIGHT);

  doc
    .polygon(
      [W, H],
      [W - 190, H],
      [W - 75, H - 90],
      [W, H - 160]
    )
    .fill(NAVY);

  doc
    .polygon(
      [W, H - 115],
      [W, H - 88],
      [W - 135, H],
      [W - 170, H]
    )
    .fill(GOLD_LIGHT);

  doc.restore();
}

function drawBackgroundPattern(
  doc: PDFKit.PDFDocument,
  W: number,
  H: number
) {
  doc
    .save()
    .opacity(0.055)
    .strokeColor(NAVY_2)
    .lineWidth(0.35);

  for (
    let y = 58;
    y < H - 48;
    y += 14
  ) {
    doc.moveTo(65, y);

    for (
      let x = 65;
      x <= W - 65;
      x += 12
    ) {
      const offset =
        Math.sin(x / 23) * 2.2;

      doc.lineTo(
        x,
        y + offset
      );
    }

    doc.stroke();
  }

  doc.restore().opacity(1);
}

function drawSeal(
  doc: PDFKit.PDFDocument,
  cx: number,
  cy: number,
  r: number
) {
  doc.save();

  doc
    .polygon(
      [cx - 25, cy + r - 5],
      [cx - 8, cy + r - 5],
      [cx - 15, cy + r + 45],
      [cx - 30, cy + r + 25]
    )
    .fill(NAVY);

  doc
    .polygon(
      [cx + 8, cy + r - 5],
      [cx + 25, cy + r - 5],
      [cx + 30, cy + r + 25],
      [cx + 15, cy + r + 45]
    )
    .fill(NAVY);

  doc
    .circle(cx, cy, r + 4)
    .fill('#d39a21');

  doc
    .circle(cx, cy, r)
    .lineWidth(2)
    .stroke('#f6d579');

  doc
    .circle(cx, cy, r - 7)
    .lineWidth(1)
    .stroke('#f6d579');

  for (let i = 0; i < 18; i++) {
    const angle =
      (i / 18) *
      Math.PI *
      2;

    const x =
      cx +
      Math.cos(angle) *
        (r - 11);

    const y =
      cy +
      Math.sin(angle) *
        (r - 11);

    doc
      .circle(x, y, 1.1)
      .fill('#ffe6a8');
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(7)
    .fillColor('#fff7dc')
    .text(
      'EMPOWERING',
      cx - r + 10,
      cy - 18,
      {
        width: (r - 10) * 2,
        align: 'center',
      }
    )
    .text(
      'FUTURES',
      cx - r + 10,
      cy - 8,
      {
        width: (r - 10) * 2,
        align: 'center',
      }
    )
    .text(
      'ENABLING',
      cx - r + 10,
      cy + 2,
      {
        width: (r - 10) * 2,
        align: 'center',
      }
    )
    .text(
      'CAREERS',
      cx - r + 10,
      cy + 12,
      {
        width: (r - 10) * 2,
        align: 'center',
      }
    );

  doc.restore();
}

function drawSignatureBlock(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  signatureAsset: string | null,
  name: string,
  title: string
) {
  if (signatureAsset) {
    try {
      doc.image(
        signatureAsset,
        x + 20,
        y - 31,
        {
          fit: [
            width - 40,
            30,
          ],
          align: 'center',
          valign: 'center',
        }
      );
    } catch {
      // Optional signature.
    }
  }

  doc
    .moveTo(
      x + 12,
      y
    )
    .lineTo(
      x + width - 12,
      y
    )
    .lineWidth(0.8)
    .strokeColor(GOLD)
    .stroke();

  doc
    .font('Helvetica-Bold')
    .fontSize(8.5)
    .fillColor(NAVY)
    .text(
      name,
      x,
      y + 7,
      {
        width,
        align: 'center',
      }
    );

  doc
    .font('Helvetica')
    .fontSize(7.3)
    .fillColor(TEXT)
    .text(
      title,
      x,
      y + 20,
      {
        width,
        align: 'center',
      }
    )
    .text(
      'AskIT Technologies',
      x,
      y + 31,
      {
        width,
        align: 'center',
      }
    );
}

async function createCertificatePdfBuffer(
  data: CertificateData
): Promise<Buffer> {
  const frontendUrl =
    process.env.FRONTEND_URL?.replace(
      /\/+$/,
      ''
    ) ||
    'http://localhost:5173';

  const verifyUrl =
    `${frontendUrl}/verify-certificate/${encodeURIComponent(
      data.certificateNo
    )}`;

  const qrDataUrl =
    await QRCode.toDataURL(
      verifyUrl,
      {
        margin: 1,
        width: 240,
        errorCorrectionLevel: 'M',
      }
    );

  const qrBuffer =
    Buffer.from(
      qrDataUrl.split(',')[1],
      'base64'
    );

  const askitLogo =
    requireAskITLogo();

  const studentPhoto =
    await loadStudentPhoto(
      data.studentPhoto
    );

  // These are optional.
  // Add them only when AskIT is actually
  // entitled to use the corresponding marks.
  const msmeLogo =
    findAsset(
      'msme-logo.png',
      'msme-logo.jpg',
      'msme-logo.jpeg'
    );

  const aicteLogo =
    findAsset(
      'aicte-logo.png',
      'aicte-logo.jpg',
      'aicte-logo.jpeg'
    );

  const directorSignature =
    findAsset(
      'director-signature.png',
      'director-signature.jpg',
      'director-signature.jpeg'
    );

  const authorizedSignature =
    findAsset(
      'authorized-signature.png',
      'authorized-signature.jpg',
      'authorized-signature.jpeg'
    );

  const mentorSignature =
    findAsset(
      'mentor-signature.png',
      'mentor-signature.jpg',
      'mentor-signature.jpeg'
    );

  const directorName =
    process.env
      .CERTIFICATE_DIRECTOR_NAME
      ?.trim() ||
    'Director';

  const authorizedName =
    process.env
      .CERTIFICATE_AUTH_SIGNATORY_NAME
      ?.trim() ||
    'Authorized Signatory';

  const mentorName =
    data.trainerName?.trim() ||
    'Program Mentor';

  return new Promise<Buffer>(
    (resolve, reject) => {
      const doc =
        new PDFDocument({
          layout: 'landscape',
          size: 'A4',
          margin: 0,
          info: {
            Title:
              `Certificate ${data.certificateNo}`,
            Author:
              'AskIT Technologies',
            Subject:
              'Internship Completion Certificate',
          },
        });

      const chunks: Buffer[] =
        [];

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

      const W =
        doc.page.width;

      const H =
        doc.page.height;

      // Background
      doc
        .rect(
          0,
          0,
          W,
          H
        )
        .fill(PAPER);

      drawBackgroundPattern(
        doc,
        W,
        H
      );

      drawCornerRibbons(
        doc,
        W,
        H
      );

      doc
        .rect(
          10,
          10,
          W - 20,
          H - 20
        )
        .lineWidth(1.1)
        .strokeColor(GOLD)
        .stroke();

      doc
        .rect(
          16,
          16,
          W - 32,
          H - 32
        )
        .lineWidth(0.45)
        .strokeColor(BORDER)
        .stroke();

      // AskIT logo
      doc.image(
        askitLogo,
        92,
        44,
        {
          fit: [
            92,
            82,
          ],
          align: 'center',
          valign: 'center',
        }
      );

      doc
        .font('Helvetica-Bold')
        .fontSize(23)
        .fillColor(NAVY)
        .text(
          'AskIT',
          187,
          58,
          {
            continued: true,
          }
        )
        .fillColor(ORANGE)
        .text(
          ' Technologies'
        );

      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(TEXT)
        .text(
          'LEARN TODAY  |  GROW TOMORROW  |  SUCCEED ALWAYS',
          188,
          87
        );

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(TEXT)
        .text(
          'info@askittechnologies.com',
          188,
          106
        );

      let badgeX =
        W - 185;

      if (aicteLogo) {
        doc.image(
          aicteLogo,
          badgeX + 80,
          43,
          {
            fit: [
              72,
              72,
            ],
          }
        );
      }

      if (msmeLogo) {
        doc.image(
          msmeLogo,
          badgeX,
          49,
          {
            fit: [
              68,
              60,
            ],
          }
        );
      }

      // Certificate title
      doc
        .moveTo(
          285,
          142
        )
        .lineTo(
          357,
          142
        )
        .lineWidth(0.8)
        .strokeColor(GOLD)
        .stroke();

      doc
        .moveTo(
          W - 357,
          142
        )
        .lineTo(
          W - 285,
          142
        )
        .lineWidth(0.8)
        .strokeColor(GOLD)
        .stroke();

      doc
        .font('Times-Bold')
        .fontSize(37)
        .fillColor(NAVY)
        .text(
          'CERTIFICATE',
          0,
          126,
          {
            width: W,
            align: 'center',
            characterSpacing: 1,
          }
        );

      doc
        .font('Times-Roman')
        .fontSize(17)
        .fillColor(GOLD)
        .text(
          'OF INTERNSHIP COMPLETION',
          0,
          170,
          {
            width: W,
            align: 'center',
            characterSpacing: 1.1,
          }
        );

      // Student photo
      const photoCx = 118;
      const photoCy = 294;
      const photoR = 62;

      doc
        .circle(
          photoCx,
          photoCy,
          photoR + 4
        )
        .lineWidth(1.3)
        .strokeColor(GOLD)
        .stroke();

      if (studentPhoto) {
        doc.save();

        doc
          .circle(
            photoCx,
            photoCy,
            photoR
          )
          .clip();

        try {
          doc.image(
            studentPhoto,
            photoCx - photoR,
            photoCy - photoR,
            {
              cover: [
                photoR * 2,
                photoR * 2,
              ],
              align: 'center',
              valign: 'center',
            }
          );
        } catch {
          doc
            .rect(
              photoCx - photoR,
              photoCy - photoR,
              photoR * 2,
              photoR * 2
            )
            .fill('#edf3fb');
        }

        doc.restore();
      } else {
        doc
          .circle(
            photoCx,
            photoCy,
            photoR
          )
          .fill('#edf3fb');

        const initial =
          data.studentName
            .trim()
            .charAt(0)
            .toUpperCase() ||
          'S';

        doc
          .font(
            'Helvetica-Bold'
          )
          .fontSize(42)
          .fillColor(NAVY)
          .text(
            initial,
            photoCx - photoR,
            photoCy - 23,
            {
              width:
                photoR * 2,
              align:
                'center',
            }
          );
      }

      drawSeal(
        doc,
        118,
        430,
        42
      );

      // Main body
      const bodyX = 215;
      const bodyW = 410;

      doc
        .font('Helvetica')
        .fontSize(12)
        .fillColor(TEXT)
        .text(
          'This is to certify that',
          bodyX,
          215,
          {
            width: bodyW,
            align: 'center',
          }
        );

      const nameSize =
        fitText(
          doc,
          data.studentName,
          bodyW - 30,
          31,
          20
        );

      doc
        .font(
          'Times-BoldItalic'
        )
        .fontSize(nameSize)
        .fillColor(NAVY)
        .text(
          data.studentName,
          bodyX,
          243,
          {
            width: bodyW,
            align: 'center',
          }
        );

      doc
        .moveTo(
          bodyX + 55,
          286
        )
        .lineTo(
          bodyX +
            bodyW -
            55,
          286
        )
        .lineWidth(0.8)
        .strokeColor(GOLD)
        .stroke();

      doc
        .font('Helvetica')
        .fontSize(10.5)
        .fillColor(TEXT)
        .text(
          'has successfully completed the Internship Program in',
          bodyX,
          308,
          {
            width: bodyW,
            align: 'center',
          }
        );

      const titleSize =
        fitText(
          doc,
          data.internshipTitle,
          bodyW - 30,
          14,
          10
        );

      doc
        .font(
          'Helvetica-Bold'
        )
        .fontSize(titleSize)
        .fillColor(NAVY)
        .text(
          data.internshipTitle,
          bodyX,
          332,
          {
            width: bodyW,
            align: 'center',
          }
        );

      doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor(TEXT)
        .text(
          'conducted by AskIT Technologies',
          bodyX,
          354,
          {
            width: bodyW,
            align: 'center',
          }
        );

      doc
        .font(
          'Helvetica-Bold'
        )
        .fontSize(10)
        .fillColor(TEXT)
        .text(
          `from ${formatDate(
            data.startDate
          )} to ${formatDate(
            data.endDate
          )} (${data.duration})`,
          bodyX,
          378,
          {
            width: bodyW,
            align: 'center',
          }
        );

      doc
        .font('Helvetica')
        .fontSize(9.1)
        .fillColor(MUTED)
        .text(
          'During this internship, the participant demonstrated dedication, enthusiasm, ' +
            'and a strong commitment to learning and professional growth.\n' +
            'We wish them continued success in their career.',
          bodyX + 28,
          408,
          {
            width:
              bodyW - 56,
            align:
              'center',
            lineGap: 3,
          }
        );

      // QR verification
      const qrX =
        W - 162;

      const qrY = 226;

      doc
        .roundedRect(
          qrX,
          qrY,
          92,
          92,
          5
        )
        .lineWidth(0.8)
        .strokeColor(GOLD)
        .stroke();

      doc.image(
        qrBuffer,
        qrX + 7,
        qrY + 7,
        {
          width: 78,
          height: 78,
        }
      );

      doc
        .font(
          'Helvetica-Bold'
        )
        .fontSize(8.2)
        .fillColor(TEXT)
        .text(
          'Verify this certificate',
          qrX - 15,
          qrY + 104,
          {
            width: 122,
            align: 'center',
          }
        );

      doc
        .font('Helvetica')
        .fontSize(6.9)
        .fillColor(BLUE)
        .text(
          verifyUrl,
          qrX - 24,
          qrY + 120,
          {
            width: 140,
            align: 'center',
            lineGap: 1,
          }
        );

      doc
        .roundedRect(
          qrX - 12,
          qrY + 161,
          118,
          38,
          4
        )
        .lineWidth(0.7)
        .strokeColor(NAVY)
        .stroke();

      doc
        .rect(
          qrX - 12,
          qrY + 161,
          118,
          17
        )
        .fill(NAVY);

      doc
        .font(
          'Helvetica-Bold'
        )
        .fontSize(7.5)
        .fillColor(
          '#ffffff'
        )
        .text(
          'Certificate No.',
          qrX - 12,
          qrY + 166,
          {
            width: 118,
            align: 'center',
          }
        );

      doc
        .font(
          'Helvetica-Bold'
        )
        .fontSize(7.2)
        .fillColor(NAVY)
        .text(
          data.certificateNo,
          qrX - 8,
          qrY + 184,
          {
            width: 110,
            align: 'center',
          }
        );

      // Signatures
      const signatureY =
        503;

      drawSignatureBlock(
        doc,
        205,
        signatureY,
        155,
        directorSignature,
        directorName,
        'Director'
      );

      drawSignatureBlock(
        doc,
        355,
        signatureY,
        155,
        authorizedSignature,
        authorizedName,
        'Authorized Signatory'
      );

      drawSignatureBlock(
        doc,
        505,
        signatureY,
        155,
        mentorSignature,
        mentorName,
        'Program Mentor'
      );

      doc
        .font('Helvetica')
        .fontSize(6.8)
        .fillColor(MUTED)
        .text(
          `Issued on ${formatDate(
            data.issuedDate
          )}`,
          W - 175,
          H - 63,
          {
            width: 115,
            align: 'right',
          }
        );

      // Footer
      doc
        .roundedRect(
          42,
          H - 40,
          W - 84,
          24,
          9
        )
        .fill(NAVY);

      doc
        .font(
          'Helvetica-Bold'
        )
        .fontSize(10)
        .fillColor(
          '#ffffff'
        )
        .text(
          '★   THANK YOU FOR CHOOSING ASKIT TECHNOLOGIES!   ★',
          42,
          H - 33,
          {
            width: W - 84,
            align: 'center',
            characterSpacing: 0.7,
          }
        );

      doc.end();
    }
  );
}

/**
 * Generates certificate and stores it permanently
 * in private Google Cloud Storage.
 */
export async function generateCertificatePdf(
  data: CertificateData
): Promise<string> {
  const pdfBuffer =
    await createCertificatePdfBuffer(
      data
    );

  const objectPath =
    `certificates/${data.certificateNo}.pdf`;

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
          `attachment; filename="${data.certificateNo}.pdf"`,
      },
    }
  );

  console.log(
    `[CERTIFICATE] Uploaded ${objectPath} to Cloud Storage`
  );

  return objectPath;
}

/**
 * Generate temporary secure URL.
 */
export async function getCertificateSignedUrl(
  objectPath: string
): Promise<string> {
  if (!objectPath) {
    throw new Error(
      'Certificate object path is missing'
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
      'LEGACY_LOCAL_CERTIFICATE'
    );
  }

  const fileName =
    objectPath
      .split('/')
      .pop() ||
    'certificate.pdf';

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