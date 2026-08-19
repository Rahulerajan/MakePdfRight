import { describe, it, before, after } from 'node:test';
import assert from 'assert';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { signSessionId } from '../server/apiUtils.js';
import { dispatchFileAction } from '../server/dispatchers/fileDispatcher.js';
import { dispatchPdfAction } from '../server/dispatchers/pdfDispatcher.js';
import { StorageJobStore } from '../server/storage/StorageJobStore.js';
import { JobService } from '../server/services/JobService.js';
import { WorkerService } from '../server/services/WorkerService.js';

class MockResponse {
  public statusCode: number = 200;
  public headers: Record<string, string> = {};
  public body: any = null;

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  setHeader(name: string, value: string) {
    this.headers[name.toLowerCase()] = value;
    return this;
  }

  json(data: any) {
    this.body = data;
    return this;
  }

  send(data: any) {
    this.body = data;
    return this;
  }
}

describe('Section 5.2 — File Upload Authorization & Routing Integration Suite', () => {
  let samplePdfBytes: Buffer;

  before(async () => {
    process.env.APP_SECRET = process.env.APP_SECRET || 'test_secret_for_suite_testing_only_12345';
    const doc = await PDFDocument.create();
    const page = doc.addPage([600, 800]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText('Sample PDF document for file upload authorization test.', { x: 50, y: 700, font, size: 12 });
    samplePdfBytes = Buffer.from(await doc.save());
  });

  it('Regression Test: Compress PDF must not fail with 404 when requesting upload authorization', async () => {
    const req: any = {
      method: 'POST',
      path: '/api/files/upload-url',
      url: '/api/files/upload-url',
      headers: {
        'x-owner-id': 'usr_regression_test'
      },
      body: {
        filename: 'contract.pdf',
        contentType: 'application/pdf',
        size: samplePdfBytes.length
      }
    };
    const res = new MockResponse();

    await dispatchFileAction(req, res);

    assert.notStrictEqual(res.statusCode, 404, 'Upload authorization endpoint MUST NOT return 404');
    assert.strictEqual(res.statusCode, 200, 'Upload authorization must return 200 OK');
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.upload?.url, 'Upload response must include signed upload URL');
    assert.ok(res.body.upload?.objectKey, 'Upload response must include objectKey');
  });

  it('Validation: Missing filename returns structured 400', async () => {
    const req: any = {
      method: 'POST',
      path: '/api/files/upload-url',
      headers: { 'x-owner-id': 'usr_test' },
      body: {
        contentType: 'application/pdf',
        size: 1024
      }
    };
    const res = new MockResponse();

    await dispatchFileAction(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.status, 'error');
    assert.ok(res.body.error.includes('Filename parameter is required'));
  });

  it('Validation: Missing or invalid file size returns structured 400', async () => {
    const req: any = {
      method: 'POST',
      path: '/api/files/upload-url',
      headers: { 'x-owner-id': 'usr_test' },
      body: {
        filename: 'test.pdf',
        contentType: 'application/pdf',
        size: 0
      }
    };
    const res = new MockResponse();

    await dispatchFileAction(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.status, 'error');
    assert.ok(res.body.error.includes('File size parameter is required'));
  });

  it('Validation: Oversized file returns structured 400', async () => {
    const req: any = {
      method: 'POST',
      path: '/api/files/upload-url',
      headers: { 'x-owner-id': 'usr_test' },
      body: {
        filename: 'huge.pdf',
        contentType: 'application/pdf',
        size: 200 * 1024 * 1024 // 200MB exceeds 150MB
      }
    };
    const res = new MockResponse();

    await dispatchFileAction(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.status, 'error');
    assert.ok(res.body.error.includes('exceeds maximum allowable upload threshold'));
  });

  it('Validation: Invalid content type returns structured 400', async () => {
    const req: any = {
      method: 'POST',
      path: '/api/files/upload-url',
      headers: { 'x-owner-id': 'usr_test' },
      body: {
        filename: 'malicious.exe',
        contentType: 'application/x-msdownload',
        size: 5000
      }
    };
    const res = new MockResponse();

    await dispatchFileAction(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.status, 'error');
    assert.ok(res.body.error.includes('Unsupported file format'));
  });

  it('Routing Parity: Query action dispatch (/api/files?action=upload-url) works identically', async () => {
    const req: any = {
      method: 'POST',
      path: '/api/files',
      url: '/api/files?action=upload-url',
      query: { action: 'upload-url' },
      headers: { 'x-owner-id': 'usr_parity_test' },
      body: {
        filename: 'report.pdf',
        contentType: 'application/pdf',
        size: 5000
      }
    };
    const res = new MockResponse();

    await dispatchFileAction(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.upload.url);
  });

  it('Unknown file route returns structured 404', async () => {
    const req: any = {
      method: 'POST',
      path: '/api/files/non-existent-action',
      url: '/api/files/non-existent-action',
      headers: { 'x-owner-id': 'usr_test' }
    };
    const res = new MockResponse();

    await dispatchFileAction(req, res);

    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.body.success, false);
  });

  it('End-to-End Compress Flow: Authorization -> Upload -> Job Creation -> Processing -> Download', async () => {
    const ownerId = 'usr_e2e_compress';
    const sessionToken = signSessionId(ownerId);

    // 1. Request upload authorization
    const authReq: any = {
      method: 'POST',
      path: '/api/files/upload-url',
      url: '/api/files/upload-url',
      headers: { 'x-session-token': sessionToken },
      body: {
        filename: 'invoice_test.pdf',
        contentType: 'application/pdf',
        size: samplePdfBytes.length
      }
    };
    const authRes = new MockResponse();
    await dispatchFileAction(authReq, authRes);

    assert.strictEqual(authRes.statusCode, 200);
    const uploadUrl = authRes.body.upload.url;
    const objectKey = authRes.body.upload.objectKey;

    // Extract query token and key from uploadUrl
    const urlObj = new URL(uploadUrl, 'http://localhost:3000');
    const token = urlObj.searchParams.get('token') || '';
    const key = urlObj.searchParams.get('key') || '';

    // 2. Binary upload via PUT /api/files/upload
    const uploadReq: any = {
      method: 'PUT',
      path: '/api/files/upload',
      url: uploadUrl,
      query: { token, key },
      headers: {
        'x-session-token': sessionToken,
        'content-type': 'application/pdf'
      },
      body: samplePdfBytes
    };
    const uploadRes = new MockResponse();
    await dispatchFileAction(uploadReq, uploadRes);

    assert.strictEqual(uploadRes.statusCode, 200);
    assert.strictEqual(uploadRes.body.success, true);
    assert.strictEqual(uploadRes.body.objectKey, objectKey);

    // 3. Create compression job
    const jobReq: any = {
      method: 'POST',
      path: '/api/pdf/job/create',
      url: '/api/pdf/job/create',
      query: { action: 'job-create' },
      headers: { 'x-session-token': sessionToken },
      body: {
        type: 'compress',
        payload: {
          inputObjectKey: objectKey,
          level: 'recommended'
        }
      }
    };
    const jobRes = new MockResponse();
    await dispatchPdfAction(jobReq, jobRes);

    assert.strictEqual(jobRes.statusCode, 200);
    assert.strictEqual(jobRes.body.success, true);
    const jobId = jobRes.body.job?.id;
    assert.ok(jobId, 'Job ID must be returned');

    // 4. Wait for background worker to complete compression job
    let completedJob: any = null;
    for (let i = 0; i < 20; i++) {
      completedJob = await JobService.getJob(jobId, ownerId);
      if (completedJob && (completedJob.status === 'completed' || completedJob.status === 'failed')) {
        break;
      }
      await new Promise(r => setTimeout(r, 50));
    }
    assert.ok(completedJob, 'Job must exist');
    assert.strictEqual(completedJob.status, 'completed', 'Processed job status must be completed');

    // 5. Query status of the completed job
    const statusReq: any = {
      method: 'GET',
      path: `/api/pdf/job/status/${jobId}`,
      url: `/api/pdf/job/status/${jobId}`,
      query: { action: 'job-status', id: jobId },
      headers: { 'x-session-token': sessionToken }
    };
    const statusRes = new MockResponse();
    await dispatchPdfAction(statusReq, statusRes);

    assert.strictEqual(statusRes.statusCode, 200);
    assert.strictEqual(statusRes.body.job.status, 'completed');
    assert.ok(statusRes.body.job.outputObjectKey, 'Job outputObjectKey must exist');
    assert.ok(statusRes.body.job.result?.output?.downloadUrl, 'Job downloadUrl must exist');

    // 6. Test Download endpoint
    const downloadUrl = statusRes.body.job.result.output.downloadUrl;
    const downloadUrlObj = new URL(downloadUrl, 'http://localhost:3000');
    const downloadKey = downloadUrlObj.searchParams.get('key') || statusRes.body.job.outputObjectKey;
    const downloadToken = downloadUrlObj.searchParams.get('token') || '';

    const downloadReq: any = {
      method: 'GET',
      path: '/api/files/download',
      url: downloadUrl,
      query: { key: downloadKey, token: downloadToken },
      headers: { 'x-session-token': sessionToken }
    };
    const downloadRes = new MockResponse();
    await dispatchFileAction(downloadReq, downloadRes);

    assert.strictEqual(downloadRes.statusCode, 200);
    assert.ok(Buffer.isBuffer(downloadRes.body));
    assert.ok(downloadRes.body.length > 0, 'Downloaded file buffer must not be empty');
  });
});
