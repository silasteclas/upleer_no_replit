import fs from 'fs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

async function createTestPDF() {
  // Create a new PDFDocument
  const pdfDoc = await PDFDocument.create();

  // Embed the Times Roman font
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  // Add a blank page to the document
  const page = pdfDoc.addPage();

  // Get the width and height of the page
  const { width, height } = page.getSize();

  // Draw a string of text toward the top of the page
  const fontSize = 30;
  page.drawText('Energia Solar - Guia Técnico', {
    x: 50,
    y: height - 4 * fontSize,
    size: fontSize,
    font: timesRomanFont,
    color: rgb(0, 0.53, 0.71),
  });

  // Add content
  const contentFontSize = 12;
  const content = `
Este é um documento técnico sobre energia solar.

Autor: Pedro Reis
ISBN: 234234234
Páginas: 109

Conteúdo:
1. Introdução à Energia Solar
2. Tipos de Painéis Solares
3. Instalação e Manutenção
4. Eficiência Energética
5. Sustentabilidade

Este documento foi criado para demonstrar o sistema de download
de arquivos PDF através do webhook do N8N.

Para mais informações, consulte nosso sistema Upleer.
  `;

  page.drawText(content, {
    x: 50,
    y: height - 6 * fontSize,
    size: contentFontSize,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
    lineHeight: contentFontSize + 2,
  });

  // Serialize the PDFDocument to bytes (a Uint8Array)
  const pdfBytes = await pdfDoc.save();

  // Write the PDF to file
  fs.writeFileSync('uploads/0421486ee1ba2135cf9c2be8298b60f4', pdfBytes);
  console.log('PDF criado com sucesso!');
}

createTestPDF().catch(console.error);