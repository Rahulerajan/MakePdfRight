import assert from 'assert';
import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { DistributedRateLimiter } from '../server/services/DistributedRateLimiter.js';
import { FileTokenService, getTokenSecret } from '../server/services/FileTokenService.js';
import { JobService } from '../server/services/JobService.js';
import { StorageService } from '../server/services/StorageService.js';
import { dispatchFileAction } from '../server/dispatchers/fileDispatcher.js';
import { dispatchPdfAction } from '../server/dispatchers/pdfDispatcher.js';
import { dispatchAiAction } from '../server/dispatchers/aiDispatcher.js';
import { applyCors, verifyAuth, validateEnvironment, signSessionId, getOwnerId } from '../server/apiUtils.js';

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

  end() {
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

  // Ensure test secret is set
  process.env.APP_SECRET = 'test_suite_secret_key_2026_xyz';

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

  // Test 1f: Missing or Wrong Secret Rejection (Item b)
  const savedAppSecret = process.env.APP_SECRET;
  const savedSessionSecret = process.env.SESSION_SECRET;
  delete process.env.APP_SECRET;
  delete process.env.SESSION_SECRET;
  assert.throws(() => {
    getTokenSecret();
  }, /APP_SECRET or SESSION_SECRET environment variable is required/, 'Unset secret must throw runtime error');

  process.env.APP_SECRET = 'secret_A';
  const tokenWithSecretA = FileTokenService.generateToken(objectKey, ownerId, 'upload', 300);
  process.env.APP_SECRET = 'secret_B_different';
  const verifyWithDifferentSecret = FileTokenService.verifyToken(tokenWithSecretA.token, 'upload');
  assert.strictEqual(verifyWithDifferentSecret, null, 'Token signed with different secret must be rejected');

  // Restore test secret
  process.env.APP_SECRET = savedAppSecret || 'test_suite_secret_key_2026_xyz';
  if (savedSessionSecret) process.env.SESSION_SECRET = savedSessionSecret;
  console.log('✅ 1f Passed: Tokens signed with wrong/missing secret are strictly rejected.');

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

  // Attempt to submit 4th job via dispatcher with signed session token
  const jobReq: any = {
    method: 'POST',
    path: '/api/pdf/job/create',
    url: '/api/pdf/job/create',
    query: { action: 'job-create' },
    headers: { 'x-owner-id': signSessionId(testJobOwner) },
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
  const signedAiHeader = signSessionId(aiOwner);

  // 1st request
  const aiReq1: any = {
    method: 'POST',
    query: { action: 'chat-pdf' },
    headers: { 'x-owner-id': signedAiHeader },
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
    headers: { 'x-owner-id': signSessionId('usr_attacker') }
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
    headers: { 'x-owner-id': signSessionId('usr_oversized') },
    body: { pdfBase64: hugeBase64 }
  };
  const hugeRes = new MockResponse();
  await dispatchPdfAction(hugeReq, hugeRes);

  assert.strictEqual(hugeRes.statusCode, 413, 'Oversized payload must return 413');
  console.log('✅ 5b Passed: Oversized payload rejected with 413.');

  // 6. Security Hardening Suite (Items a, c, d)
  console.log('\n--- 6. Security Hardening & Vulnerability Remediation Suite ---');

  // Test 6a: X-Owner-Id: admin No Longer Bypasses Ownership Checks (Item a)
  const victimOwner = 'victim_user_100';
  const victimKey = `users/${victimOwner}/uploads/confidential.pdf`;
  const provider = StorageService.getStorageProvider();
  await provider.upload(victimKey, Buffer.from('VICTIM_DATA'), { contentType: 'application/pdf', ownerId: victimOwner });

  // Direct ownership check with 'admin' must reject
  await assert.rejects(async () => {
    await StorageService.verifyObjectOwnership(victimKey, 'admin');
  }, /Requested file does not exist or has expired./, 'StorageService MUST NOT allow admin bypass');

  // Dispatcher download attempt with 'admin' header/token must reject with 404
  const adminReq: any = {
    method: 'GET',
    path: '/api/files/download',
    query: { action: 'download', key: victimKey },
    headers: { 'x-owner-id': signSessionId('admin') }
  };
  const adminRes = new MockResponse();
  await dispatchFileAction(adminReq, adminRes);
  assert.strictEqual(adminRes.statusCode, 404, 'Admin identity MUST NOT bypass ownership check');
  console.log('✅ 6a Passed: X-Owner-Id: admin ownership bypass completely eliminated.');

  // Test 6b: CORS Allowlist Enforcement (Item c)
  process.env.ALLOWED_ORIGINS = 'https://www.makepdfright.com,https://app.makepdfright.com';

  // Request from non-allowlisted origin
  const evilCorsReq: any = {
    method: 'GET',
    headers: { origin: 'https://evil-hacker.com' }
  };
  const evilCorsRes = new MockResponse();
  applyCors(evilCorsReq, evilCorsRes as any);
  assert.strictEqual(evilCorsRes.headers['access-control-allow-origin'], undefined, 'Non-allowlisted origin MUST NOT receive Access-Control-Allow-Origin');
  assert.strictEqual(evilCorsRes.headers['access-control-allow-credentials'], undefined, 'Non-allowlisted origin MUST NOT receive credentials header');

  // OPTIONS preflight from non-allowlisted origin
  const evilOptionsReq: any = {
    method: 'OPTIONS',
    headers: { origin: 'https://evil-hacker.com' }
  };
  const evilOptionsRes = new MockResponse();
  const handled = applyCors(evilOptionsReq, evilOptionsRes as any);
  assert.strictEqual(handled, true);
  assert.strictEqual(evilOptionsRes.statusCode, 403, 'Preflight from non-allowlisted origin must be 403');
  assert.strictEqual(evilOptionsRes.headers['access-control-allow-origin'], undefined);

  // Request from allowlisted origin
  const goodCorsReq: any = {
    method: 'GET',
    headers: { origin: 'https://www.makepdfright.com' }
  };
  const goodCorsRes = new MockResponse();
  applyCors(goodCorsReq, goodCorsRes as any);
  assert.strictEqual(goodCorsRes.headers['access-control-allow-origin'], 'https://www.makepdfright.com');
  assert.strictEqual(goodCorsRes.headers['access-control-allow-credentials'], 'true');
  console.log('✅ 6b Passed: CORS strictly enforced against ALLOWED_ORIGINS allowlist.');

  // Test 6c: Production Authentication & Boot-Time Validation (Item d)
  const prevNodeEnv6c = process.env.NODE_ENV;
  const prevApiKey6c = process.env.API_ACCESS_KEY;
  const prevWorkerSecret6c = process.env.WORKER_SECRET;
  const prevAppSecret6c = process.env.APP_SECRET;

  try {
    process.env.NODE_ENV = 'production';
    delete process.env.API_ACCESS_KEY;
    process.env.WORKER_SECRET = 'test_worker_secret_999';
    process.env.APP_SECRET = 'test_app_secret_999';

    // Boot validation must succeed when API_ACCESS_KEY is unset (optional)
    assert.doesNotThrow(() => {
      validateEnvironment();
    }, 'Boot validation MUST succeed in production when API_ACCESS_KEY is unset');

    // verifyAuth must allow request through when API_ACCESS_KEY is unset
    const authReq: any = { headers: {} };
    const authRes = new MockResponse();
    const isAuth = verifyAuth(authReq, authRes as any);
    assert.strictEqual(isAuth, true, 'verifyAuth must allow requests when API_ACCESS_KEY is unset');

    // Boot validation must not crash in production even if WORKER_SECRET is missing
    delete process.env.WORKER_SECRET;
    assert.doesNotThrow(() => {
      validateEnvironment();
    }, 'Boot validation MUST not crash in production if WORKER_SECRET is missing');

    // Worker endpoint must fail closed in production when WORKER_SECRET is unset
    const workerReq: any = {
      method: 'POST',
      path: '/api/pdf/job/process',
      query: { action: 'job-process' },
      body: { jobId: '123', ownerId: 'user_1' }
    };
    const workerRes = new MockResponse();
    await dispatchPdfAction(workerReq, workerRes);
    assert.strictEqual(workerRes.statusCode, 500, 'Worker endpoint must fail closed in production without WORKER_SECRET');

    // Restore WORKER_SECRET and test when API_ACCESS_KEY is configured in production
    process.env.WORKER_SECRET = 'test_worker_secret_999';
    process.env.API_ACCESS_KEY = 'prod_secret_api_key_999';
    const authedReq: any = {
      headers: { 'authorization': 'Bearer prod_secret_api_key_999' }
    };
    const authedRes = new MockResponse();
    assert.strictEqual(verifyAuth(authedReq, authedRes as any), true, 'Valid API key must pass verifyAuth');

    const wrongKeyReq: any = {
      headers: { 'authorization': 'Bearer wrong_key' }
    };
    const wrongKeyRes = new MockResponse();
    assert.strictEqual(verifyAuth(wrongKeyReq, wrongKeyRes as any), false, 'Invalid API key must be rejected');
    assert.strictEqual(wrongKeyRes.statusCode, 401);

  } finally {
    process.env.NODE_ENV = prevNodeEnv6c;
    if (prevApiKey6c) process.env.API_ACCESS_KEY = prevApiKey6c; else delete process.env.API_ACCESS_KEY;
    if (prevWorkerSecret6c) process.env.WORKER_SECRET = prevWorkerSecret6c; else delete process.env.WORKER_SECRET;
    if (prevAppSecret6c) process.env.APP_SECRET = prevAppSecret6c; else delete process.env.APP_SECRET;
  }
  console.log('✅ 6c Passed: Production authentication and boot validation verified.');

  // Test 6d: Server-Signed Session Cookie Issuance & Identity Verification
  // 1. Fresh request with no cookie generates a new signed session cookie and returns a valid ownerId
  const freshReq: any = { headers: {} };
  const freshRes = new MockResponse();
  const freshOwnerId = getOwnerId(freshReq, freshRes as any);
  assert.ok(freshOwnerId, 'Fresh request must receive an ownerId');
  assert.strictEqual(freshReq.ownerId, freshOwnerId, 'Request must cache ownerId on req object');
  
  const setCookieHeader = freshRes.headers['set-cookie'];
  assert.ok(setCookieHeader, 'Response must include a Set-Cookie header for fresh session');
  const cookieMatch = Array.isArray(setCookieHeader)
    ? setCookieHeader[0].match(/sid=([^;]+)/)
    : (setCookieHeader as string).match(/sid=([^;]+)/);
  assert.ok(cookieMatch, 'Set-Cookie header must contain a sid cookie');
  const issuedCookieVal = cookieMatch[1];

  // 2. Subsequent request with the issued signed session cookie resolves to the exact same persistent ownerId
  const subReq: any = { headers: { cookie: `sid=${issuedCookieVal}` } };
  const subRes = new MockResponse();
  const subOwnerId = getOwnerId(subReq, subRes as any);
  assert.strictEqual(subOwnerId, freshOwnerId, 'Subsequent request with signed session cookie must resolve to same persistent ownerId');
  assert.strictEqual(subRes.headers['set-cookie'], undefined, 'Valid existing session should not re-issue cookie');

  // 3. Forged / tampered cookie value falls back to anonymous hashing (not the forged identity)
  const tamperedCookieVal = issuedCookieVal + 'malicious_tamper';
  const tamperedReq: any = { headers: { cookie: `sid=${tamperedCookieVal}`, 'user-agent': 'TestAgent', 'x-forwarded-for': '1.2.3.4' } };
  const tamperedRes = new MockResponse();
  const tamperedOwnerId = getOwnerId(tamperedReq, tamperedRes as any);
  assert.notStrictEqual(tamperedOwnerId, freshOwnerId, 'Tampered cookie must not resolve to original ownerId');
  assert.ok(tamperedOwnerId.startsWith('anon_'), 'Tampered cookie must fall back to anonymous hash');

  // 4. Raw client-provided header without valid signature is treated as untrusted and falls back to anon
  const rawAttackerHeader: any = { headers: { 'x-owner-id': 'victim_user_100' } };
  const resolvedOwner = getOwnerId(rawAttackerHeader);
  assert.notStrictEqual(resolvedOwner, 'victim_user_100', 'Unsigned client-provided header MUST NOT be trusted as ownerId');
  assert.ok(resolvedOwner.startsWith('anon_'), 'Unsigned identity must fallback to anonymous hash');

  // 5. Signed token passed in cookie or header resolves to the exact subject
  const explicitSignedToken = signSessionId('legit_user_200');
  const signedCookieReq: any = { headers: { cookie: `session_id=${explicitSignedToken}` } };
  assert.strictEqual(getOwnerId(signedCookieReq), 'legit_user_200', 'Valid signed session cookie must resolve accurately');

  console.log('✅ 6d Passed: Server-signed session cookie issuance, verification, and tampering protections verified.');

  console.log('\n==================================================');
  console.log('ALL SECTION 6 RATE LIMITING & SECURITY TESTS PASSED!');
  console.log('==================================================');
  process.exit(0);
}
