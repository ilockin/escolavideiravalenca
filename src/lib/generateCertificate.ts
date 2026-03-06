import jsPDF from 'jspdf';

interface CertificateData {
  studentName: string;
  courseName: string;
  completionDate: Date;
}

export function generateCertificate({ studentName, courseName, completionDate }: CertificateData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Background
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, w, h, 'F');

  // Border
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(3);
  doc.rect(12, 12, w - 24, h - 24);
  doc.setDrawColor(191, 219, 254);
  doc.setLineWidth(0.8);
  doc.rect(16, 16, w - 32, h - 32);

  // Decorative line top
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(w / 2 - 60, 45, w / 2 + 60, 45);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(30, 41, 59);
  doc.text('CERTIFICADO', w / 2, 38, { align: 'center' });

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(100, 116, 139);
  doc.text('de Conclusão de Curso', w / 2, 52, { align: 'center' });

  // Body text
  doc.setFontSize(13);
  doc.setTextColor(71, 85, 105);
  doc.text('Certificamos que', w / 2, 72, { align: 'center' });

  // Student name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(30, 41, 59);
  doc.text(studentName, w / 2, 88, { align: 'center' });

  // Underline name
  const nameWidth = doc.getTextWidth(studentName);
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.6);
  doc.line(w / 2 - nameWidth / 2, 91, w / 2 + nameWidth / 2, 91);

  // Completed text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(71, 85, 105);
  doc.text('concluiu com êxito o curso', w / 2, 104, { align: 'center' });

  // Course name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(59, 130, 246);
  doc.text(courseName, w / 2, 118, { align: 'center' });

  // Date
  const formattedDate = completionDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text(`Emitido em ${formattedDate}`, w / 2, 135, { align: 'center' });

  // Signature line
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(w / 2 - 50, 160, w / 2 + 50, 160);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Escola Videira Valença', w / 2, 167, { align: 'center' });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Este certificado foi gerado automaticamente pela plataforma.', w / 2, h - 20, { align: 'center' });

  doc.save(`certificado-${courseName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}
