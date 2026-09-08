import assert from 'node:assert/strict';
import test from 'node:test';
import { getOwnerId, validateEnvironment } from '../server/apiUtils.js';
import { DistributedRateLimiter } from '../server/services/DistributedRateLimiter.js';
import { dispatchFileAction } from '../server/dispatchers/fileDispatcher.js';

class MockResponse {
  statusCode = 200;
  headers: Record<string, any> = {};
  body: any = null;
  status(code: number) { this.statusCode = code; return this; }
  setHeader(key: string, value: any) { this.headers[key.toLowerCase()] = value; return this; }
  getHeader(key: string) { return this.headers[key.toLowerCase()]; }
  json(data: any) { this.body = data; return this; }
  send(data: any) { this.body = data; return this; }
  end() { return this; }
}

test('production requires a stable session signing secret', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousSession = process.env.SESSION_SECRET;
  const previousApp = process.env.APP_SECRET;
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.SESSION_SECRET;
    delete process.env.APP_SECRET;
    assert.throws(() => validateEnvironment(), /SESSION_SECRET or APP_SECRET is required in production/);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousNodeEnv;
    if (previousSession === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = previousSession;
    if (previousApp === undefined) delete process.env.APP_SECRET; else process.env.APP_SECRET = previousApp;
  }
});

test('fresh anonymous identities remain unique but share a network abuse bucket', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousLimit = process.env.RATE_LIMIT_GENERAL;
  const previousSecret = process.env.APP_SECRET;
  try {
    process.env.NODE_ENV = 'test';
    process.env.APP_SECRET = 'security-regression-test-secret-at-least-32-chars';
    process.env.RATE_LIMIT_GENERAL = '1';

    const req1: any = { headers: { 'x-forwarded-for': '203.0.113.10', 'user-agent': 'RegressionAgent/1' } };
    const req2: any = { headers: { 'x-forwarded-for': '203.0.113.10', 'user-agent': 'RegressionAgent/1' } };
    const owner1 = getOwnerId(req1, new MockResponse() as any);
    const owner2 = getOwnerId(req2, new MockResponse() as any);

    assert.notEqual(owner1, owner2, 'separate fresh sessions must not share storage ownership');
    assert.match(owner1, /^anon_[a-f0-9]{16}_/);
    assert.match(owner2, /^anon_[a-f0-9]{16}_/);
    assert.equal(owner1.split('_')[1], owner2.split('_')[1], 'same network fingerprint should share an abuse bucket');

    await DistributedRateLimiter.resetLocal(owner1, 'general', 'rotation-regression');

    const first = await DistributedRateLimiter.checkRateLimit(owner1, 'general', 'rotation-regression');
    const second = await DistributedRateLimiter.checkRateLimit(owner2, 'general', 'rotation-regression');
    assert.equal(first.allowed, true);
    assert.equal(second.allowed, false, 'discarding the first cookie must not mint a fresh rate quota');
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousNodeEnv;
    if (previousLimit === undefined) delete process.env.RATE_LIMIT_GENERAL; else process.env.RATE_LIMIT_GENERAL = previousLimit;
    if (previousSecret === undefined) delete process.env.APP_SECRET; else process.env.APP_SECRET = previousSecret;
  }
});

test('owner-wide purge is fail-closed instead of deleting global temporary data', async () => {
  const previousSecret = process.env.APP_SECRET;
  try {
    process.env.APP_SECRET = 'security-regression-test-secret-at-least-32-chars';
    const req: any = {
      method: 'POST',
      path: '/api/files/purge-user-data',
      query: { action: 'purge-user-data' },
      headers: { 'x-forwarded-for': '203.0.113.20', 'user-agent': 'RegressionAgent/2' }
    };
    const res = new MockResponse();
    await dispatchFileAction(req, res as any);
    assert.equal(res.statusCode, 501);
    assert.equal(res.body.success, false);
  } finally {
    if (previousSecret === undefined) delete process.env.APP_SECRET; else process.env.APP_SECRET = previousSecret;
  }
});
