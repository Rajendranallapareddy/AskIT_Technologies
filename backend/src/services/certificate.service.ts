import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

const CERT_DIR = path.join(process.cwd(), 'uploads', 'certificates');
if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR, { recursive: true });

interface CertificateData {
  certificateNo: string;
  studentName: string;
  studentPhotoPath?: string | null; // absolute filesystem path, if the student has a profile picture
  internshipTitle: string;
  duration: string;
  startDate: Date;
  endDate: Date;
  trainerName?: string;
  issuedDate: Date;
}

const NAVY = '#1e3a8a';
const NAVY_DARK = '#0f1d45';
const GOLD = '#c8952c';
const ORANGE = '#f97316';

// Draws a simple gold medallion/seal (concentric circles + a starburst) as a
// vector graphic — used in place of a scanned "official seal" image, which
// we don't have a real asset for.
function drawSeal(doc: PDFKit.PDFDocument, cx: number, cy: number, r: number) {
  doc.save();
  doc.circle(cx, cy, r).lineWidth(2).stroke(GOLD);
  doc.circle(cx, cy, r - 6).lineWidth(1).stroke(GOLD);
  const points = 16;
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const x = cx + Math.cos(angle) * (r - 10);
    const y = cy + Math.sin(angle) * (r - 10);
    doc.circle(x, y, 1.4).fill(GOLD);
  }
  doc.fontSize(8).fillColor(GOLD).font('Times-BoldItalic').text('VERIFIED', cx - r + 8, cy - 5, { width: (r - 8) * 2, align: 'center' });
  doc.fontSize(6).fillColor(GOLD).font('Helvetica').text('ASK IT TECHNOLOGIES', cx - r + 8, cy + 6, { width: (r - 8) * 2, align: 'center' });
  doc.restore();
}

// Generates a branded, professional PDF certificate — logo lettering, gold
// decorative border, the student's photo (if they've uploaded one),
// internship start/end dates, a verification QR code, and a seal graphic —
// and returns the relative file path to store on the Certificate record.
export function generateCertificatePdf(data: CertificateData): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const fileName = `${data.certificateNo}.pdf`;
      const filePath = path.join(CERT_DIR, fileName);
      const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 0 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      const W = doc.page.width;
      const H = doc.page.height;

      // --- Background & decorative border ------------------------------
      doc.rect(0, 0, W, H).fill('#fffdf8');
      doc.rect(18, 18, W - 36, H - 36).lineWidth(2.5).stroke(NAVY);
      doc.rect(26, 26, W - 52, H - 52).lineWidth(1).stroke(GOLD);
      doc.rect(31, 31, W - 62, H - 62).lineWidth(0.5).stroke(NAVY);
      // Corner flourishes
      [[40, 40], [W - 40, 40], [40, H - 40], [W - 40, H - 40]].forEach(([x, y]) => {
        doc.circle(x, y, 4).fill(GOLD);
      });

      // --- Header: branded logo lettering -------------------------------
      doc.fontSize(30).font('Helvetica-Bold').fillColor(NAVY).text('ASK', 0, 55, { continued: true, align: 'center' });
      doc.fillColor(ORANGE).text('IT', { continued: false });
      // Re-center manually since continued text doesn't auto-center as a block:
      doc.fontSize(9).font('Helvetica').fillColor('#555').text('TECHNOLOGIES', 0, 90, { align: 'center', characterSpacing: 2 });

      doc.moveTo(W / 2 - 90, 108).lineTo(W / 2 + 90, 108).lineWidth(1).stroke(GOLD);

      doc.fontSize(22).font('Times-BoldItalic').fillColor(NAVY_DARK)
        .text('Certificate of Completion', 0, 122, { align: 'center' });

      // --- Student photo (top-right medallion) --------------------------
      const photoSize = 78;
      const photoX = W - 150;
      const photoY = 55;
      doc.save();
      doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2 + 4).lineWidth(2).stroke(GOLD);
      if (data.studentPhotoPath && fs.existsSync(data.studentPhotoPath)) {
        doc.save();
        doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2).clip();
        doc.image(data.studentPhotoPath, photoX, photoY, { width: photoSize, height: photoSize });
        doc.restore();
      } else {
        doc.circle(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2).fill(NAVY);
        const initial = data.studentName.trim().charAt(0).toUpperCase();
        doc.fontSize(28).fillColor('#fff').font('Helvetica-Bold')
          .text(initial, photoX, photoY + photoSize / 2 - 16, { width: photoSize, align: 'center' });
      }
      doc.restore();

      // --- Body text -----------------------------------------------------
      doc.fontSize(11).font('Helvetica').fillColor('#555').text('This is to proudly certify that', 0, 175, { align: 'center' });

      doc.fontSize(32).font('Times-BoldItalic').fillColor(NAVY_DARK).text(data.studentName, 0, 195, { align: 'center' });
      doc.moveTo(W / 2 - 160, 240).lineTo(W / 2 + 160, 240).lineWidth(0.75).stroke(GOLD);

      doc.fontSize(12.5).font('Helvetica').fillColor('#444').text(
        `has successfully completed the internship program` +
          (data.trainerName ? ` under the mentorship of ${data.trainerName}` : ''),
        100, 252, { align: 'center', width: W - 200 }
      );
      doc.fontSize(16).font('Helvetica-Bold').fillColor(NAVY).text(`"${data.internshipTitle}"`, 100, 274, { align: 'center', width: W - 200 });

      doc.fontSize(11).font('Helvetica').fillColor('#555').text(
        `Duration: ${data.duration}  •  ${data.startDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} ` +
          `to ${data.endDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
        0, 302, { align: 'center' }
      );

      // --- Footer: cert no, issued date, QR, seal, signature --------------
      const footerY = H - 105;

      doc.fontSize(9).fillColor('#777').font('Helvetica')
        .text(`Certificate No: ${data.certificateNo}`, 55, footerY)
        .text(`Issued: ${data.issuedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 55, footerY + 14);

      // QR code linking to the public verification page
      const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-certificate/${data.certificateNo}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 0, width: 130 });
      const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
      doc.image(qrBuffer, 55, footerY + 30, { width: 55, height: 55 });
      doc.fontSize(6.5).fillColor('#999').text('Scan to verify', 50, footerY + 87, { width: 65, align: 'center' });

      // Gold seal
      drawSeal(doc, W / 2, footerY + 45, 38);

      // Signature line
      doc.moveTo(W - 230, footerY + 30).lineTo(W - 60, footerY + 30).lineWidth(0.75).stroke('#999');
      doc.fontSize(9).fillColor('#555').font('Helvetica-Bold').text('Authorized Signatory', W - 230, footerY + 34, { width: 170, align: 'center' });
      doc.fontSize(8).fillColor('#888').font('Helvetica').text('ASK IT Technologies', W - 230, footerY + 47, { width: 170, align: 'center' });

      doc.end();
      stream.on('finish', () => resolve(`/uploads/certificates/${fileName}`));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}
