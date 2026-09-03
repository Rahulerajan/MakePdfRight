/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert';
import test from 'node:test';
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
});
