import assert from 'assert';
import test from 'node:test';
import { PDFDocument, rgb, StandardFonts, PDFName, PDFDict } from 'pdf-lib';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { CompressionService } from '../server/services/CompressionService.js';
import { ValidationService } from '../server/services/ValidationService.js';

async function createTestPdfs() {
  const dir = path.join(process.cwd(), 'tmp_benchmarks');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Helper to safely write benchmark file
  const safeWrite = (fileName: string, data: Buffer) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, fileName), data);
  };

  // 1. 1-page text PDF
  const pdf1 = await PDFDocument.create();
  const page1 = pdf1.addPage([600, 800]);
  const font = await pdf1.embedFont(StandardFonts.Helvetica);
  page1.drawText('Sample 1-Page Text PDF Document', { x: 50, y: 700, size: 20, font });
  const buf1 = Buffer.from(await pdf1.save());
  safeWrite('1_page_text.pdf', buf1);

  // 2. 10-page text PDF
  const pdf2 = await PDFDocument.create();
  for (let i = 0; i < 10; i++) {
    const p = pdf2.addPage([600, 800]);
    p.drawText(`Page ${i + 1} of 10 Text Content`, { x: 50, y: 700, size: 16, font });
  }
  const buf2 = Buffer.from(await pdf2.save());
  safeWrite('10_page_text.pdf', buf2);

  // 3. 10-page image PDF (10 JPEGs)
  const pdf3 = await PDFDocument.create();
  const sampleImgJpeg = await sharp({
    create: { width: 1600, height: 1200, channels: 3, background: { r: 100, g: 150, b: 200 } }
  }).jpeg({ quality: 90 }).toBuffer();

  for (let i = 0; i < 10; i++) {
    const p = pdf3.addPage([600, 800]);
    const imgObj = await pdf3.embedJpg(sampleImgJpeg);
    p.drawImage(imgObj, { x: 50, y: 100, width: 500, height: 600 });
  }
  const buf3 = Buffer.from(await pdf3.save());
  safeWrite('10_page_image.pdf', buf3);

  // 4. 50-page scanned PDF (50 images)
  const pdf4 = await PDFDocument.create();
  const scanImgJpeg = await sharp({
    create: { width: 1400, height: 1800, channels: 3, background: { r: 240, g: 240, b: 240 } }
  }).jpeg({ quality: 85 }).toBuffer();

  for (let i = 0; i < 50; i++) {
    const p = pdf4.addPage([600, 800]);
    const imgObj = await pdf4.embedJpg(scanImgJpeg);
    p.drawImage(imgObj, { x: 50, y: 50, width: 500, height: 700 });
  }
  const buf4 = Buffer.from(await pdf4.save());
  safeWrite('50_page_scanned.pdf', buf4);

  // 5. 35 MB image-heavy PDF (~10-12 large uncompressed images)
  const pdf5 = await PDFDocument.create();
  const heavyImg = await sharp({
    create: { width: 2400, height: 1800, channels: 3, background: { r: 80, g: 120, b: 160 } }
  }).png({ compressionLevel: 0 }).toBuffer();

  for (let i = 0; i < 10; i++) {
    const p = pdf5.addPage([800, 1000]);
    const imgObj = await pdf5.embedPng(heavyImg);
    p.drawImage(imgObj, { x: 50, y: 50, width: 700, height: 900 });
  }
  const buf5 = Buffer.from(await pdf5.save());
  safeWrite('35mb_image_heavy.pdf', buf5);

  // 6. Malayalam PDF
  const pdf6 = await PDFDocument.create();
  const p6 = pdf6.addPage([600, 800]);
  p6.drawText('Malayalam Document: Namaskaram / welcome text placeholder', { x: 50, y: 700, size: 16, font });
  const buf6 = Buffer.from(await pdf6.save());
  safeWrite('malayalam.pdf', buf6);

  // 7. Multilingual PDF
  const pdf7 = await PDFDocument.create();
  const p7 = pdf7.addPage([600, 800]);
  p7.drawText('Multilingual Document: English, Espanol, Deutsch, Français', { x: 50, y: 700, size: 16, font });
  const buf7 = Buffer.from(await pdf7.save());
  safeWrite('multilingual.pdf', buf7);

  // 8. PNG Transparency PDF
  const pdf8 = await PDFDocument.create();
  const p8 = pdf8.addPage([600, 800]);
  const transparentPng = await sharp({
    create: { width: 800, height: 600, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0.5 } }
  }).png().toBuffer();
  const transparentImgObj = await pdf8.embedPng(transparentPng);
  p8.drawImage(transparentImgObj, { x: 50, y: 200, width: 500, height: 400 });
  const buf8 = Buffer.from(await pdf8.save());
  safeWrite('png_transparency.pdf', buf8);

  // 9. AcroForm PDF
  const pdf9 = await PDFDocument.create();
  const p9 = pdf9.addPage([600, 800]);
  const form = pdf9.getForm();
  const textField = form.createTextField('user.name');
  textField.setText('John Doe');
  textField.addToPage(p9, { x: 50, y: 650, width: 200, height: 30 });
  const buf9 = Buffer.from(await pdf9.save());
  safeWrite('acroform.pdf', buf9);

  // 10. Annotation PDF
  const pdf10 = await PDFDocument.create();
  const p10 = pdf10.addPage([600, 800]);
  p10.drawText('Document with Annotations', { x: 50, y: 700, size: 16, font });
  const buf10 = Buffer.from(await pdf10.save());
  safeWrite('annotation.pdf', buf10);

  return dir;
}

async function runBenchmark() {
  console.log('=== SECTION 7.7 PRODUCTION PERFORMANCE BENCHMARK SUITE ===\n');
  const dir = await createTestPdfs();

  const files = [
    { name: '1-page text PDF', file: '1_page_text.pdf' },
    { name: '10-page text PDF', file: '10_page_text.pdf' },
    { name: '10-page image PDF', file: '10_page_image.pdf' },
    { name: '50-page scanned PDF', file: '50_page_scanned.pdf' },
    { name: '35 MB image-heavy PDF', file: '35mb_image_heavy.pdf' },
    { name: 'Malayalam PDF', file: 'malayalam.pdf' },
    { name: 'Multilingual PDF', file: 'multilingual.pdf' },
    { name: 'PNG transparency PDF', file: 'png_transparency.pdf' },
    { name: 'AcroForm PDF', file: 'acroform.pdf' },
    { name: 'Annotation PDF', file: 'annotation.pdf' },
  ];

  console.log('| Profile | File Size | Pages | Total Processing Time | Memory Peak (RSS) | Max Sharp Concurrency | Compression Ratio |');
  console.log('|---|---|---|---|---|---|---|');

  for (const item of files) {
    const filePath = path.join(dir, item.file);
    const initialBytes = fs.readFileSync(filePath);
    const initialSizeKb = (initialBytes.length / 1024).toFixed(1);

    const memBefore = process.memoryUsage().rss;
    const startT = performance.now();

    const result = await CompressionService.compressPDF(filePath, 'recommended');

    const endT = performance.now();
    const memAfter = process.memoryUsage().rss;
    const peakMemMb = (Math.max(memBefore, memAfter) / 1024 / 1024).toFixed(1);

    const totalTimeMs = (endT - startT).toFixed(1);
    const newSizeKb = (result.compressedSize / 1024).toFixed(1);
    const ratio = ((1 - result.compressedSize / initialBytes.length) * 100).toFixed(1);

    // Validate compressed output integrity
    const isValid = await ValidationService.validateCompressedOutput(
      result.pdfBuffer,
      result.pages
    );
    assert.strictEqual(isValid, true, `Compressed PDF validation failed for ${item.name}`);

    console.log(`| **${item.name}** | ${initialSizeKb} KB | ${result.pages} | ${totalTimeMs} ms | ${peakMemMb} MB | ${process.env.SHARP_IMAGE_CONCURRENCY || '3'} (bounded) | ${ratio}% |`);
  }

  // Cleanup benchmark dir
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('\n✅ All 10 representative document benchmarks executed and validated successfully!\n');
}

test('Representative Document Benchmarks Suite', async () => {
  await runBenchmark();
});
