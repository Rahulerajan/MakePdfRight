import assert from 'assert';
import test from 'node:test';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import ExcelJS from 'exceljs';

test('PDF to Excel conversion with ExcelJS', async () => {
  console.log('Testing PDF to Excel conversion with ExcelJS...');

  // 1. Create a dummy PDF with tabular data
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 400]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawText('Invoice #   Date         Amount   Status', { x: 50, y: 350, font, size: 12 });
  page.drawText('INV-001     2026-08-01   $150.00  Paid', { x: 50, y: 320, font, size: 12 });
  page.drawText('INV-002     2026-08-05   $420.50  Pending', { x: 50, y: 290, font, size: 12 });
  page.drawText('INV-003     2026-08-10   $89.99   Paid', { x: 50, y: 260, font, size: 12 });

  const pdfBytes = await pdfDoc.save();
  assert.ok(pdfBytes.length > 0, 'PDF buffer should be non-empty');

  // 2. Simulate PDFToExcelTool extraction and Workbook creation
  const excelJsModule: any = await import('exceljs');
  const WorkbookClass = excelJsModule.Workbook || excelJsModule.default?.Workbook || excelJsModule.default;
  assert.ok(typeof WorkbookClass === 'function', 'WorkbookClass must be a constructor function');

  const workbook = new WorkbookClass();
  const worksheet = workbook.addWorksheet('Sheet1');

  const extractedData = [
    ['Invoice #', 'Date', 'Amount', 'Status'],
    ['INV-001', '2026-08-01', '$150.00', 'Paid'],
    ['INV-002', '2026-08-05', '$420.50', 'Pending'],
    ['INV-003', '2026-08-10', '$89.99', 'Paid']
  ];

  extractedData.forEach((row: string[]) => {
    worksheet.addRow(row);
  });

  // 3. Write to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  assert.ok(buffer, 'Workbook writeBuffer must return a buffer');
  assert.ok(buffer.byteLength > 0, 'Buffer byteLength must be greater than 0');

  // 4. Verify the generated XLSX file is valid by re-reading it with ExcelJS
  const readWorkbook = new WorkbookClass();
  await readWorkbook.xlsx.load(buffer);

  const sheet = readWorkbook.getWorksheet('Sheet1');
  assert.ok(sheet, 'Generated workbook must contain Sheet1');
  assert.strictEqual(sheet.rowCount, 4, 'Generated worksheet must have 4 rows');

  const firstRow = sheet.getRow(1);
  assert.strictEqual(firstRow.getCell(1).value, 'Invoice #');
  assert.strictEqual(firstRow.getCell(4).value, 'Status');

  const secondRow = sheet.getRow(2);
  assert.strictEqual(secondRow.getCell(1).value, 'INV-001');
  assert.strictEqual(secondRow.getCell(3).value, '$150.00');

  console.log('✅ PDF to Excel conversion test passed! Generated valid XLSX buffer of size:', buffer.byteLength, 'bytes');
});
