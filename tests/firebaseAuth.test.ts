/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert';
import test from 'node:test';
import http from 'http';
import express from 'express';
import { requireFirebaseAuth, createRequireFirebaseAuth } from '../server/middleware/requireFirebaseAuth';
import { getOwnerId, signSessionId } from '../server/apiUtils';

function createMockReqRes(overrides: {
  headers?: Record<string, string>;
  body?: any;
  query?: any;
  cookies?: Record<string, string>;
}) {
  const req: any = {
    headers: overrides.headers || {},
    body: overrides.body || {},
    query: overrides.query || {},
    cookies: overrides.cookies || {},
    get(name: string) {
      return this.headers[name.toLowerCase()] || this.headers[name];
    },
  };

  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
    cookie(name: string, value: string) {
      this.headers[`set-cookie`] = `${name}=${value}`;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
  };

  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  return { req, res, next, wasNextCalled: () => nextCalled };
}

test('Firebase Auth Middleware & Isolation Unit Tests', async () => {
  console.log('--- Running Firebase Auth Unit Tests ---');

  // Test 1: Unauthenticated request rejection (missing Authorization header)
  console.log('Test 1: Unauthenticated request rejection...');
  {
    const { req, res, next, wasNextCalled } = createMockReqRes({});
    await requireFirebaseAuth(req, res, next);

    assert.strictEqual(res.statusCode, 401, 'Must reject with 401 when no auth header is present');
    assert.strictEqual(res.body?.status, 'error');
    assert.strictEqual(wasNextCalled(), false, 'next() must NOT be called on unauthenticated request');
    assert.strictEqual(req.authUser, undefined, 'req.authUser must remain undefined');
  }
  console.log('✅ Test 1 Passed: Unauthenticated requests rejected.');

  // Test 2: Malformed authorization header rejection
  console.log('Test 2: Malformed authorization header rejection...');
  {
    // Non-Bearer scheme
    const { req: reqBasic, res: resBasic, next: nextBasic } = createMockReqRes({
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    });
    await requireFirebaseAuth(reqBasic, resBasic, nextBasic);
    assert.strictEqual(resBasic.statusCode, 401, 'Must reject non-Bearer scheme');

    // Empty Bearer token
    const { req: reqEmpty, res: resEmpty, next: nextEmpty } = createMockReqRes({
      headers: { authorization: 'Bearer   ' },
    });
    await requireFirebaseAuth(reqEmpty, resEmpty, nextEmpty);
    assert.strictEqual(resEmpty.statusCode, 401, 'Must reject empty Bearer token');
  }
  console.log('✅ Test 2 Passed: Malformed tokens rejected.');

  // Test 3: Verified token UID propagation
  console.log('Test 3: Verified token UID propagation...');
  {
    const mockUid = 'firebase_user_verified_999';
    const mockEmail = 'verified.tester@example.com';

    const testMiddleware = createRequireFirebaseAuth(async (token: string) => {
      if (token === 'valid-crypto-id-token') {
        return {
          uid: mockUid,
          email: mockEmail,
          email_verified: true,
          name: 'Verified Tester',
        };
      }
      throw new Error('Firebase ID token has expired or is invalid.');
    });

    const { req, res, next, wasNextCalled } = createMockReqRes({
      headers: { authorization: 'Bearer valid-crypto-id-token' },
    });

    await testMiddleware(req, res, next);

    assert.strictEqual(wasNextCalled(), true, 'next() must be called for valid token');
    assert.notStrictEqual(req.authUser, undefined, 'req.authUser must be populated');
    assert.strictEqual(req.authUser?.uid, mockUid, 'req.authUser.uid must match verified UID');
    assert.strictEqual(req.authUser?.email, mockEmail, 'req.authUser.email must match decoded email');
  }
  console.log('✅ Test 3 Passed: Verified token UID correctly propagated.');

  // Test 4: Refusal to derive identity from client-supplied request body or headers
  console.log('Test 4: Refusal to derive identity from client-supplied values...');
  {
    const cryptographicallyVerifiedUid = 'real_verified_uid_456';
    const attackerSpoofedUid = 'attacker_spoofed_admin_uid';

    const testMiddleware = createRequireFirebaseAuth(async (token: string) => {
      if (token === 'attacker-signed-token') {
        return { uid: cryptographicallyVerifiedUid };
      }
      throw new Error('Invalid token');
    });

    // Attacker sends spoofed UID in body, query, custom header, and cookie
    const { req, res, next, wasNextCalled } = createMockReqRes({
      headers: {
        authorization: 'Bearer attacker-signed-token',
        'x-owner-id': attackerSpoofedUid,
      },
      body: { uid: attackerSpoofedUid, user_id: attackerSpoofedUid },
      query: { uid: attackerSpoofedUid },
      cookies: { sid: attackerSpoofedUid },
    });

    await testMiddleware(req, res, next);

    assert.strictEqual(wasNextCalled(), true);
    assert.strictEqual(
      req.authUser?.uid,
      cryptographicallyVerifiedUid,
      'UID MUST be strictly derived from verified token, NEVER from client body/headers/cookies'
    );
    assert.notStrictEqual(
      req.authUser?.uid,
      attackerSpoofedUid,
      'Spoofed client-supplied UID must be completely ignored'
    );
  }
  console.log('✅ Test 4 Passed: Client-supplied identity spoofing is rejected.');

  // Test 5: Non-interfering behavior with existing anonymous PDF tool processing
  console.log('Test 5: Non-interfering behavior with anonymous session cookie...');
  {
    const rawSessionId = 'anon_sess_abc123';
    const signedToken = signSessionId(rawSessionId);

    // Anonymous session continues to use sid cookie independently of Firebase Auth
    const { req: anonReq, res: anonRes } = createMockReqRes({
      headers: { cookie: `sid=${signedToken}` },
    });

    const ownerId = getOwnerId(anonReq, anonRes);
    assert.strictEqual(ownerId, rawSessionId, 'Anonymous PDF tools continue to resolve sid session');
    assert.strictEqual(anonReq.authUser, undefined, 'Anonymous session does not touch req.authUser');
  }
  console.log('✅ Test 5 Passed: Anonymous PDF processing operates in complete isolation.');

  // Test 6: Unconfigured Firebase Admin fails closed with 503
  console.log('Test 6: Unconfigured Firebase Admin fails closed with 503...');
  {
    const { FirebaseConfigError } = await import('../server/services/firebaseAdmin');
    const testMiddleware = createRequireFirebaseAuth(async () => {
      throw new FirebaseConfigError();
    });

    const { req, res, next, wasNextCalled } = createMockReqRes({
      headers: { authorization: 'Bearer some-token' },
    });

    await testMiddleware(req, res, next);
    assert.strictEqual(res.statusCode, 503, 'Must return 503 when Firebase Admin is unconfigured');
    assert.strictEqual(res.body?.code, 'SERVICE_UNAVAILABLE');
    assert.strictEqual(wasNextCalled(), false);
  }
  console.log('✅ Test 6 Passed: Unconfigured Firebase Admin safely yields 503.');
});

test('Express Integration: Session Cookie Issuance & Middleware Ordering', async () => {
  console.log('--- Running Express Middleware Ordering Integration Tests ---');

  const app = express();

  // Mirrors standardLimiter in server.ts: passing res to getOwnerId ensures fresh session gets sid cookie
  async function standardLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
    const ownerId = (req as any).ownerId || getOwnerId(req as any, res as any);
    next();
  }

  app.use('/api/', standardLimiter);

  // Session endpoint
  app.all('/api/session', (req, res) => {
    const ownerId = getOwnerId(req, res);
    res.json({ success: true, sessionId: ownerId });
  });

  // Protected AI Workspace namespace
  app.use('/api/ai-workspace', requireFirebaseAuth);
  app.get('/api/ai-workspace/auth-check', (req, res) => {
    res.json({ success: true, authenticated: true });
  });

  // Anonymous PDF tool endpoint
  app.get('/api/pdf-tools/test-action', (req, res) => {
    const ownerId = getOwnerId(req, res);
    res.json({ success: true, ownerId });
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Fresh request to /api/session returns Set-Cookie with sid
    console.log('Integration 1: Fresh /api/session sets sid cookie...');
    const res1 = await fetch(`${baseUrl}/api/session`);
    assert.strictEqual(res1.status, 200, 'Fresh request must return 200');

    const setCookie = res1.headers.get('set-cookie');
    assert.ok(setCookie, 'Set-Cookie header must be present');
    assert.ok(setCookie.includes('sid='), 'Cookie must be named sid');
    assert.ok(setCookie.includes('HttpOnly'), 'Cookie must be HttpOnly');
    assert.ok(setCookie.includes('Secure'), 'Cookie must be Secure');
    assert.ok(setCookie.includes('SameSite=Strict'), 'Cookie must be SameSite=Strict');

    const data1: any = await res1.json();
    assert.strictEqual(data1.success, true);
    assert.ok(data1.sessionId, 'Session ID must be non-empty');

    const match = setCookie.match(/sid=([^;]+)/);
    assert.ok(match, 'Must match sid cookie value');
    const sidCookieHeader = match[0];

    // 2. Subsequent request carrying that cookie receives same anonymous session identity
    console.log('Integration 2: Subsequent request resolves identical session identity...');
    const res2 = await fetch(`${baseUrl}/api/session`, {
      headers: { Cookie: sidCookieHeader },
    });
    assert.strictEqual(res2.status, 200);
    const data2: any = await res2.json();
    assert.strictEqual(data2.sessionId, data1.sessionId, 'Must resolve the identical session identity');

    // 3. Anonymous PDF route accessible without Firebase Auth
    console.log('Integration 3: Anonymous PDF route accessible without Firebase Auth...');
    const resAnon = await fetch(`${baseUrl}/api/pdf-tools/test-action`, {
      headers: { Cookie: sidCookieHeader },
    });
    assert.strictEqual(resAnon.status, 200);
    const dataAnon: any = await resAnon.json();
    assert.strictEqual(dataAnon.ownerId, data1.sessionId, 'Anonymous PDF tool uses same sid identity');

    // 4. Protected AI Workspace endpoint rejects unauthenticated request with 401
    console.log('Integration 4: Protected AI Workspace endpoint rejects unauthenticated request...');
    const resAuth = await fetch(`${baseUrl}/api/ai-workspace/auth-check`, {
      headers: { Cookie: sidCookieHeader },
    });
    assert.strictEqual(resAuth.status, 401, 'Must reject with 401 even when sid cookie is present');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  console.log('✅ Express Integration Tests Passed.');
});
