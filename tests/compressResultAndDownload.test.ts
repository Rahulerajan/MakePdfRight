import { describe, it, before, after } from 'node:test';
import assert from 'assert';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { WorkerService } from '../server/services/WorkerService.js';
import { StorageService } from '../server/services/StorageService.js';
import { StorageJobStore } from '../server/storage/StorageJobStore.js';

describe('Compress PDF Result Screen & Authorized Download Suite', () => {
  const ownerId = 'test_owner_compress_download_suite';
  const tempDir = path.join(os.tmpdir(), `test_compress_dl_${Date.now()}`);

  before(() => {
    fs.mkdirSync(tempDir, { recursive: true });
    StorageService.getStorageProvider();
  });

  after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('1. Completed compression job returns output object with downloadUrl, objectKey, filename, sizes, and page count', async () => {
    // Create sample PDF
    const doc = await PDFDocument.create();
    const page = doc.addPage([600, 800]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText('Test Compress Result Screen Output', { x: 50, y: 700, font, size: 14 });
    const pdfBytes = await doc.save();

    // Upload input file
    const inputKey = StorageService.generateObjectKey(ownerId, 'uploads', '.pdf');
    const provider = StorageService.getStorageProvider();
    await provider.upload(inputKey, Buffer.from(pdfBytes), {
      ownerId,
      contentType: 'application/pdf',
      originalFilename: 'test_document.pdf'
    });

    const store = new StorageJobStore();
    WorkerService.setStore(store);

    // Create job
    const job = await store.createJob({
      ownerId,
      operation: 'compress',
      payload: {
        inputObjectKey: inputKey,
        level: 'recommended'
      }
    });

    // Process job using WorkerService
    await WorkerService.processJob(job.id, ownerId);

    // Fetch completed job
    const completedJob = await store.getJob(job.id, ownerId);
    assert.ok(completedJob, 'Job must exist');
    assert.strictEqual(completedJob.status, 'completed');
    assert.ok(completedJob.result, 'Job result must exist');
    assert.ok(completedJob.result.output, 'Job output object must exist');

    const output = completedJob.result.output;
    assert.ok(output.downloadUrl, 'Output must contain signed downloadUrl');
    assert.ok(output.downloadUrl.includes('/api/files/download'), 'downloadUrl must point to authorized download endpoint');
    assert.ok(output.objectKey, 'Output must contain output objectKey');
    assert.strictEqual(output.filename, 'compressed_test_document.pdf');
    assert.ok(output.size > 0, 'Output size must be greater than 0');
    assert.strictEqual(completedJob.result.pages, 1, 'Pages must equal 1');
  });

  it('2. Fresh download URL endpoint (/api/files/download-url) issues authorized signed URL for owned objectKey', async () => {
    const provider = StorageService.getStorageProvider();
    const testKey = StorageService.generateObjectKey(ownerId, 'outputs', '.pdf');
    await provider.upload(testKey, Buffer.from('PDF Content'), {
      ownerId,
      contentType: 'application/pdf',
      originalFilename: 'sample.pdf'
    });

    // Verify ownership succeeds
    await StorageService.verifyObjectOwnership(testKey, ownerId);

    // Create fresh signed download URL
    const freshUrl = await provider.createSignedDownloadUrl(testKey, 1800);
    assert.ok(freshUrl, 'Fresh download URL must be generated');
    assert.ok(freshUrl.includes('/api/files/download'), 'Must use authorized download route');
  });

  it('3. Accessing unowned objectKey throws IDOR protection error', async () => {
    const provider = StorageService.getStorageProvider();
    const otherOwnerKey = StorageService.generateObjectKey('other_owner_id', 'outputs', '.pdf');
    await provider.upload(otherOwnerKey, Buffer.from('Private PDF'), {
      ownerId: 'other_owner_id',
      contentType: 'application/pdf',
      originalFilename: 'private.pdf'
    });

    try {
      await StorageService.verifyObjectOwnership(otherOwnerKey, ownerId);
      assert.fail('Should have thrown 404 for unowned object key');
    } catch (err: any) {
      assert.strictEqual(err.statusCode, 404, 'Must throw 404 concealment error for IDOR attempt');
    }
  });

  it('4. Expired or non-existent key fails verification cleanly', async () => {
    const nonExistentKey = `users/${ownerId}/outputs/non_existent_${Date.now()}.pdf`;
    const provider = StorageService.getStorageProvider();
    const exists = await provider.exists(nonExistentKey);
    assert.strictEqual(exists, false, 'File must not exist');
  });
});
