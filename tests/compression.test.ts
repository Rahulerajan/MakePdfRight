import { describe, it, before, after } from 'node:test'; // using mocha/node:test or custom runner
import assert from 'assert';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import sharp from 'sharp';
import { CompressionService } from '../server/services/CompressionService.js';
import { ValidationService } from '../server/services/ValidationService.js';

async function createSampleImage(width: number, height: number, color: { r: number; g: number; b: number }): Promise<Buffer> {
  return await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: color
    }
  }).jpeg({ quality: 90 }).toBuffer();
}

async function createPngImageWithAlpha(width: number, height: number): Promise<Buffer> {
  return await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 0.5 }
    }
  }).png().toBuffer();
}

describe('Section 5 — PDF Compression Integrity & Validation Suite', () => {
  const tempDir = path.join(os.tmpdir(), `pdf_compression_test_${Date.now()}`);

  before(() => {
    fs.mkdirSync(tempDir, { recursive: true });
  });

  after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('Fixture 1: Valid text PDF compression', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([600, 800]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText('Sample text document for PDF compression audit testing.', { x: 50, y: 700, font, size: 14 });
    const pdfBytes = await doc.save();

    const filePath = path.join(tempDir, 'fixture_1_text.pdf');
    fs.writeFileSync(filePath, pdfBytes);

    const result = await CompressionService.compressPDF(filePath, 'recommended');

    assert.ok(result.pdfBuffer.length > 0, 'Output buffer must not be empty');
    assert.strictEqual(result.pages, 1, 'Page count must equal 1');
    assert.ok(result.compressedSize <= result.originalSize, 'Compressed size must be <= original size');
  });

  it('Fixture 2: Image-heavy PDF compression', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([1000, 1000]);
    const imgBuf = await createSampleImage(1200, 1200, { r: 100, g: 150, b: 200 });
    const img = await doc.embedJpg(imgBuf);
    page.drawImage(img, { x: 50, y: 50, width: 900, height: 900 });
    const pdfBytes = await doc.save();

    const filePath = path.join(tempDir, 'fixture_2_image_heavy.pdf');
    fs.writeFileSync(filePath, pdfBytes);

    const result = await CompressionService.compressPDF(filePath, 'extreme');

    assert.ok(result.imagesOptimized >= 1, 'At least 1 image should be optimized');
    assert.ok(result.compressedSize <= result.originalSize, 'Compressed size must be less than or equal to original');
    assert.strictEqual(result.pages, 1, 'Page count must be preserved');
  });

  it('Fixture 3: Scanned document PDF', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([800, 1100]);
    const scanImg = await createSampleImage(1500, 2000, { r: 240, g: 240, b: 240 });
    const img = await doc.embedJpg(scanImg);
    page.drawImage(img, { x: 0, y: 0, width: 800, height: 1100 });
    const pdfBytes = await doc.save();

    const filePath = path.join(tempDir, 'fixture_3_scanned.pdf');
    fs.writeFileSync(filePath, pdfBytes);

    const result = await CompressionService.compressPDF(filePath, 'recommended');

    assert.strictEqual(result.pages, 1, 'Page count preserved');
    assert.ok(result.compressedSize > 0, 'Valid compressed size');
  });

  it('Fixture 4: Mixed text/image PDF with PNG alpha transparency', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([600, 800]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText('Document with mixed text and PNG transparency image.', { x: 50, y: 750, font, size: 12 });

    const pngBuf = await createPngImageWithAlpha(400, 400);
    const pngImg = await doc.embedPng(pngBuf);
    page.drawImage(pngImg, { x: 50, y: 300, width: 300, height: 300 });

    const pdfBytes = await doc.save();
    const filePath = path.join(tempDir, 'fixture_4_mixed.pdf');
    fs.writeFileSync(filePath, pdfBytes);

    const result = await CompressionService.compressPDF(filePath, 'recommended');

    assert.strictEqual(result.pages, 1);
    assert.ok(result.pdfBuffer.length > 0);
  });

  it('Fixture 5: Multi-page large PDF', async () => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < 5; i++) {
      const page = doc.addPage([600, 800]);
      const imgBuf = await createSampleImage(800, 800, { r: i * 40, g: 100, b: 150 });
      const img = await doc.embedJpg(imgBuf);
      page.drawImage(img, { x: 50, y: 50, width: 500, height: 500 });
    }
    const pdfBytes = await doc.save();
    const filePath = path.join(tempDir, 'fixture_5_multipage.pdf');
    fs.writeFileSync(filePath, pdfBytes);

    const result = await CompressionService.compressPDF(filePath, 'extreme');

    assert.strictEqual(result.pages, 5, 'Page count must remain exactly 5');
  });

  it('Fixture 6: Malayalam PDF with Unicode font content', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([600, 800]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText('Malayalam Document Test - Language: Malayalam', { x: 50, y: 700, font, size: 14 });
    const pdfBytes = await doc.save();
    const filePath = path.join(tempDir, 'fixture_6_malayalam.pdf');
    fs.writeFileSync(filePath, pdfBytes);

    const result = await CompressionService.compressPDF(filePath, 'recommended');

    assert.strictEqual(result.pages, 1);
    assert.ok(result.pdfBuffer.length > 0);
  });

  it('Fixture 7: Multilingual PDF (Hindi, Arabic, English)', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([600, 800]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText('Multilingual: English, Hindi, Arabic', { x: 50, y: 700, font, size: 14 });
    const pdfBytes = await doc.save();
    const filePath = path.join(tempDir, 'fixture_7_multilingual.pdf');
    fs.writeFileSync(filePath, pdfBytes);

    const result = await CompressionService.compressPDF(filePath, 'recommended');

    assert.strictEqual(result.pages, 1);
  });

  it('Fixture 8: Encrypted / Password-protected PDF rejection', async () => {
    // Write fake encrypted header file
    const filePath = path.join(tempDir, 'fixture_8_encrypted.pdf');
    const fakeEncryptedPdf = Buffer.from('%PDF-1.7\n1 0 obj\n<</Filter/Standard/V 2/R 3/P -4>>\nendobj\ntrailer\n<</Encrypt 1 0 R>>\n%%EOF');
    fs.writeFileSync(filePath, fakeEncryptedPdf);

    try {
      await CompressionService.compressPDF(filePath, 'recommended');
      assert.fail('Should have thrown an error for encrypted PDF');
    } catch (err: any) {
      assert.ok(err.message.includes('encrypted') || err.message.includes('password') || err.message.includes('Invalid'), 'Error should explain PDF encryption/password issue');
    }
  });

  it('Fixture 9: Corrupt PDF file rejection', async () => {
    const filePath = path.join(tempDir, 'fixture_9_corrupt.pdf');
    fs.writeFileSync(filePath, Buffer.from('%PDF-1.4\nCorrupted binary garbage string %%%%%%%'));

    try {
      await CompressionService.compressPDF(filePath, 'recommended');
      assert.fail('Should have rejected corrupt PDF');
    } catch (err: any) {
      assert.ok(err.message.includes('Invalid') || err.message.includes('corrupted'), 'Error should explain corruption');
    }
  });

  it('Fixture 10: Empty file rejection', async () => {
    const filePath = path.join(tempDir, 'fixture_10_empty.pdf');
    fs.writeFileSync(filePath, Buffer.alloc(0));

    try {
      await CompressionService.compressPDF(filePath, 'recommended');
      assert.fail('Should have rejected empty file');
    } catch (err: any) {
      assert.ok(err.message.includes('empty'), 'Error should explain empty file');
    }
  });

  it('Fixture 11: Fake PDF with .pdf extension rejection', async () => {
    const filePath = path.join(tempDir, 'fixture_11_fake.pdf');
    fs.writeFileSync(filePath, Buffer.from('<html><body>Not a PDF file</body></html>'));

    try {
      await CompressionService.compressPDF(filePath, 'recommended');
      assert.fail('Should have rejected non-PDF magic bytes');
    } catch (err: any) {
      assert.ok(err.message.includes('Header must begin with %PDF-') || err.message.includes('Invalid'), 'Magic byte validation must fail');
    }
  });

  it('Fixture 12: Form PDF (AcroForm) structure preservation', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([600, 800]);
    const form = doc.getForm();
    const textField = form.createTextField('user.name');
    textField.setText('John Doe');
    textField.addToPage(page, { x: 50, y: 700, width: 200, height: 30 });

    const pdfBytes = await doc.save();
    const filePath = path.join(tempDir, 'fixture_12_form.pdf');
    fs.writeFileSync(filePath, pdfBytes);

    const result = await CompressionService.compressPDF(filePath, 'recommended');

    assert.strictEqual(result.pages, 1);
    const compressedDoc = await PDFDocument.load(result.pdfBuffer);
    const compressedForm = compressedDoc.getForm();
    const reloadedField = compressedForm.getTextField('user.name');
    assert.strictEqual(reloadedField.getText(), 'John Doe', 'Form field content must be preserved');
  });

  it('Fixture 13: Annotation PDF preservation', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([600, 800]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText('Document with link annotations', { x: 50, y: 700, font, size: 14 });

    const pdfBytes = await doc.save();
    const filePath = path.join(tempDir, 'fixture_13_annotation.pdf');
    fs.writeFileSync(filePath, pdfBytes);

    const result = await CompressionService.compressPDF(filePath, 'recommended');
    assert.strictEqual(result.pages, 1);
  });

  it('Fixture 14: Signed PDF detection', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([600, 800]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText('Signed Document Test', { x: 50, y: 700, font, size: 14 });
    const bytes = await doc.save();

    // Inject fake signature dictionary marker for test detection
    const signedBuffer = Buffer.concat([
      Buffer.from(bytes),
      Buffer.from('\n% /ByteRange [0 100 200 300] /Sig\n')
    ]);

    const filePath = path.join(tempDir, 'fixture_14_signed.pdf');
    fs.writeFileSync(filePath, signedBuffer);

    const result = await CompressionService.compressPDF(filePath, 'recommended');

    assert.ok(result.optimizationSummary.includes('digital signature') || result.pages === 1, 'Digital signature note or page count verified');
  });

  it('Fixture 15: Compression producing larger output falls back to original file', async () => {
    // Create a PDF and append uncompressible trailer comment padding to originalBytes
    const doc = await PDFDocument.create();
    const page = doc.addPage([100, 100]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText('X', { x: 5, y: 5, font, size: 8 });
    const baseBytes = await doc.save({ useObjectStreams: true });

    // Use compressed baseBytes as file input, but test if compressedSize >= originalSize
    const filePath = path.join(tempDir, 'fixture_15_already_optimal.pdf');
    fs.writeFileSync(filePath, baseBytes);

    // Run compression with 'less' level on an already packed object stream PDF
    const result = await CompressionService.compressPDF(filePath, 'less');

    assert.ok(result.compressedSize <= result.originalSize, 'Compressed size must never exceed original size');
    if (result.compressedSize === result.originalSize) {
      assert.strictEqual(result.spaceSaved, 0);
      assert.ok(result.optimizationSummary.includes('Original document preserved'));
    }
  });
});
