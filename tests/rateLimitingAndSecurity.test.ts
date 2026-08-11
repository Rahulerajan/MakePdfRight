import assert from 'assert';
import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { DistributedRateLimiter } from '../server/services/DistributedRateLimiter.js';
import { FileTokenService } from '../server/services/FileTokenService.js';
import { JobService } from '../server/services/JobService.js';
import { StorageService } from '../server/services/StorageService.js';
import { dispatchFileAction } from '../server/dispatchers/fileDispatcher.js';
import { dispatchPdfAction } from '../server/dispatchers/pdfDispatcher.js';
import { dispatchAiAction } from '../server/dispatchers/aiDispatcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock Response object for dispatcher testing
class MockResponse {
  public statusCode: number = 200;
  public headers: Record<string, string> = {};
  public body: any = null;

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  setHeader(key: string, value: string) {
    this.headers[key.toLowerCase()] = value;
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

// Child Process Handler for Multi-Process Rate Limiting Simulation
if (process.argv[2] === '--child-rate-check') {
  const ownerId = process.argv[3];
  const category = process.argv[4] as any;
  const action = process.argv[5];

  DistributedRateLimiter.checkRateLimit(ownerId, category, action)
    .then((result) => {
      if (process.send) {
        process.send({ allowed: result.allowed, limit: result.limit, remaining: result.remaining });
      }
      process.exit(0);
    })
    .catch((err) => {
      if (process.send) {
        process.send({ allowed: false, error: err.message });
      }
      process.exit(1);
    });
} else {
  // Execute test cases
  runRateLimitingAndSecurityTests().catch((err) => {
    console.error('❌ Rate Limiting & Security tests failed:', err);
    process.exit(1);
  });
}

async function runRateLimitingAndSecurityTests() {
  console.log('==================================================');
  console.log('SECTION 6 — DISTRIBUTED RATE LIMITING & SECURITY SUITE');
  console.log('==================================================');

  // 1. Token Security & Tampering Tests
  console.log('\n--- 1. File Token Security & Tampering Tests ---');
  const ownerId = 'usr_token_sec';
  const objectKey = `users/${ownerId}/uploads/doc_test.pdf`;

  // Test 1a: Valid Token Generation & Verification
  const uploadTokenObj = FileTokenService.generateToken(objectKey, ownerId, 'upload', 300);
  const downloadTokenObj = FileTokenService.generateToken(objectKey, ownerId, 'download', 300);

  const verifiedUpload = FileTokenService.verifyToken(uploadTokenObj.token, 'upload');
  assert.ok(verifiedUpload, 'Valid upload token must be verified');
  assert.strictEqual(verifiedUpload.ownerId, ownerId);
  assert.strictEqual(verifiedUpload.objectKey, objectKey);
  console.log('✅ 1a Passed: Valid token generated and verified.');

  // Test 1b: Token Action Scope Enforcement
  const scopeFail = FileTokenService.verifyToken(uploadTokenObj.token, 'download');
  assert.strictEqual(scopeFail, null, 'Upload token MUST NOT be valid for download scope');
  const scopeFail2 = FileTokenService.verifyToken(downloadTokenObj.token, 'upload');
  assert.strictEqual(scopeFail2, null, 'Download token MUST NOT be valid for upload scope');
  console.log('✅ 1b Passed: Scope isolation enforced (upload != download).');

  // Test 1c: Signature Tampering Protection
  const tamperedToken = uploadTokenObj.token.slice(0, -4) + 'XXXX';
  const tamperedResult = FileTokenService.verifyToken(tamperedToken, 'upload');
  assert.strictEqual(tamperedResult, null, 'Tampered signature token MUST be rejected');
  console.log('✅ 1c Passed: Signature tampering correctly rejected.');

  // Test 1d: Expired Token Protection
  const expiredTokenObj = FileTokenService.generateToken(objectKey, ownerId, 'upload', -10);
  const expiredResult = FileTokenService.verifyToken(expiredTokenObj.token, 'upload');
  assert.strictEqual(expiredResult, null, 'Expired token MUST be rejected');
  console.log('✅ 1d Passed: Expired token rejected.');

  // Test 1e: Payload Key Modification Protection
  const parts = uploadTokenObj.token.split('.');
  const decodedPayload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8'));
  decodedPayload.objectKey = 'users/attacker/stolen.pdf';
  const forgedEncoded = Buffer.from(JSON.stringify(decodedPayload), 'utf-8').toString('base64url');
  const forgedToken = `${forgedEncoded}.${parts[1]}`;
  const forgedResult = FileTokenService.verifyToken(forgedToken, 'upload');
  assert.strictEqual(forgedResult, null, 'Payload key modification MUST invalidate signature');
  console.log('✅ 1e Passed: Payload tampering invalidates signature.');

  // 2. Multi-Process Rate Limiting Test (10 Independent Child Processes)
  console.log('\n--- 2. Multi-Instance Rate Limiting Test (10 Concurrent Processes) ---');
  process.env.RATE_LIMIT_PDF = '5'; // Set strict limit of 5 for test key
  const testRateOwner = `usr_multi_proc_${Date.now()}`;

  const childCount = 10;
  const childPromises: Promise<{ allowed: boolean }>[] = [];

  for (let i = 0; i < childCount; i++) {
    const p = new Promise<{ allowed: boolean }>((resolve) => {
      const child = fork(__filename, ['--child-rate-check', testRateOwner, 'pdf', 'compress_test']);
      child.on('message', (msg: any) => resolve(msg));
      child.on('error', () => resolve({ allowed: false }));
    });
    childPromises.push(p);
  }

  const results = await Promise.all(childPromises);
  const allowedCount = results.filter(r => r.allowed).length;
  const rejectedCount = results.filter(r => !r.allowed).length;

  console.log(`Results across 10 independent processes: Allowed=${allowedCount}, RateLimited(429)=${rejectedCount}`);
  assert.strictEqual(allowedCount, 5, 'Exactly configured limit of 5 requests must be allowed across independent processes');
  assert.strictEqual(rejectedCount, 5, 'Remaining 5 requests must be rejected with rate limit 429');
  console.log('✅ 2 Passed: 10-process rate limit test strictly enforced global limit across independent instances.');

  // 3. Active Job Concurrency Limit Test (MAX_ACTIVE_JOBS_PER_OWNER)
  console.log('\n--- 3. Active Job Limit Test (MAX_ACTIVE_JOBS_PER_OWNER) ---');
  process.env.MAX_ACTIVE_JOBS_PER_OWNER = '3';
  const testJobOwner = `usr_active_job_${Date.now()}`;

  // Seed 3 queued active jobs
  for (let i = 0; i < 3; i++) {
    await JobService.createJob('compress', testJobOwner, { level: 'recommended' });
  }

  // Attempt to submit 4th job via dispatcher
  const jobReq: any = {
    method: 'POST',
    path: '/api/pdf/job/create',
    url: '/api/pdf/job/create',
    query: { action: 'job-create' },
    headers: { 'x-owner-id': testJobOwner },
    body: {
      type: 'rotate',
      payload: { angle: 90 }
    }
  };
  const jobRes = new MockResponse();
  await dispatchPdfAction(jobReq, jobRes);

  assert.strictEqual(jobRes.statusCode, 429, 'Submitting active jobs beyond limit MUST return 429');
  assert.strictEqual(jobRes.body.error.code, 'RATE_LIMITED');
  assert.ok(jobRes.body.error.message.includes('Maximum active jobs limit reached'), 'Error message must reflect active job limit');
  console.log('✅ 3 Passed: MAX_ACTIVE_JOBS_PER_OWNER strictly enforced.');

  // 4. AI Abuse & Concurrency Test
  console.log('\n--- 4. AI Endpoint Abuse & Rate Limiting Test ---');
  process.env.RATE_LIMIT_AI = '2';
  const aiOwner = `usr_ai_rate_${Date.now()}`;

  // 1st request
  const aiReq1: any = {
    method: 'POST',
    query: { action: 'chat-pdf' },
    headers: { 'x-owner-id': aiOwner },
    body: { prompt: 'Summarize PDF' }
  };
  const aiRes1 = new MockResponse();
  await dispatchAiAction(aiReq1, aiRes1);

  // 2nd request
  const aiRes2 = new MockResponse();
  await dispatchAiAction(aiReq1, aiRes2);

  // 3rd request should be blocked by rate limit
  const aiRes3 = new MockResponse();
  await dispatchAiAction(aiReq1, aiRes3);

  assert.strictEqual(aiRes3.statusCode, 429, '3rd AI request exceeding limit of 2 must return 429');
  assert.strictEqual(aiRes3.body.error.code, 'RATE_LIMITED');
  console.log('✅ 4 Passed: AI endpoint rate limit strictly enforced.');

  // 5. Security Response Matrix & Absence of Existence Leakage
  console.log('\n--- 5. Security Response Matrix Tests ---');
  
  // Test 5a: Accessing nonexistent object without ownership concealment leakage
  const leakReq: any = {
    method: 'GET',
    path: '/download',
    query: { action: 'download', key: 'users/usr_other_owner/secret.pdf' },
    headers: { 'x-owner-id': 'usr_attacker' }
  };
  const leakRes = new MockResponse();
  await dispatchFileAction(leakReq, leakRes);

  assert.strictEqual(leakRes.statusCode, 404, 'Accessing unowned/nonexistent object must return 404');
  assert.strictEqual(leakRes.body.error, 'Requested file does not exist or has expired.', 'Must conceal object existence');
  console.log('✅ 5a Passed: Conceals existence of unowned objects with 404.');

  // Test 5b: Oversized Base64 Payload rejection (413)
  const hugeBase64 = 'A'.repeat(8 * 1024 * 1024); // > 7MB base64
  const hugeReq: any = {
    method: 'POST',
    query: { action: 'compress' },
    headers: { 'x-owner-id': 'usr_oversized' },
    body: { pdfBase64: hugeBase64 }
  };
  const hugeRes = new MockResponse();
  await dispatchPdfAction(hugeReq, hugeRes);

  assert.strictEqual(hugeRes.statusCode, 413, 'Oversized payload must return 413');
  console.log('✅ 5b Passed: Oversized payload rejected with 413.');

  console.log('\n==================================================');
  console.log('ALL SECTION 6 RATE LIMITING & SECURITY TESTS PASSED!');
  console.log('==================================================');
}
