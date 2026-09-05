/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert';
import test from 'node:test';
import http from 'http';
import express from 'express';
import {
  WorkspaceService,
  InMemoryWorkspaceStore,
  WorkspaceValidationError,
  WorkspaceNotFoundError,
  WorkspacePersistenceError,
  validateStrictBody,
  WorkspaceDto,
} from '../server/services/workspaceService';
import { createAiWorkspaceRouter } from '../server/routes/aiWorkspaceRoutes';

test('Workspace Unit & Isolation Tests', async (t) => {
  const store = new InMemoryWorkspaceStore();
  const service = new WorkspaceService(store);

  const USER_A = 'user_alpha_123';
  const USER_B = 'user_beta_456';

  await t.test('1. Creation and Input Validation', async () => {
    // Valid creation
    const wsA1 = await service.createWorkspace(USER_A, {
      name: 'Alpha Workspace 1',
      customInstructions: 'Act as a senior auditor.',
    });

    // DTO checks: Never expose ownerId or UID
    assert.strictEqual((wsA1 as any).ownerId, undefined, 'WorkspaceDto must NEVER contain ownerId');
    assert.strictEqual((wsA1 as any).uid, undefined, 'WorkspaceDto must NEVER contain uid');
    assert.strictEqual(wsA1.name, 'Alpha Workspace 1');
    assert.strictEqual(wsA1.customInstructions, 'Act as a senior auditor.');
    assert.ok(wsA1.id && typeof wsA1.id === 'string');
    assert.ok(wsA1.createdAt && typeof wsA1.createdAt === 'string');
    assert.ok(wsA1.updatedAt && typeof wsA1.updatedAt === 'string');
    // Ensure ISO string timestamp format
    assert.ok(!isNaN(Date.parse(wsA1.createdAt)), 'createdAt must be valid ISO string');
    assert.ok(!isNaN(Date.parse(wsA1.updatedAt)), 'updatedAt must be valid ISO string');

    // Empty name validation
    await assert.rejects(
      async () => {
        await service.createWorkspace(USER_A, { name: '   ' });
      },
      (err: any) => err instanceof WorkspaceValidationError && err.statusCode === 400
    );

    // Non-string name validation
    await assert.rejects(
      async () => {
        await service.createWorkspace(USER_A, { name: 12345 as any });
      },
      (err: any) => err instanceof WorkspaceValidationError && err.statusCode === 400
    );

    // Name length > 100 chars
    const longName = 'A'.repeat(101);
    await assert.rejects(
      async () => {
        await service.createWorkspace(USER_A, { name: longName });
      },
      (err: any) => err instanceof WorkspaceValidationError && err.statusCode === 400
    );

    // Custom instructions > 4000 chars rejected
    const longInstructions = 'I'.repeat(4001);
    await assert.rejects(
      async () => {
        await service.createWorkspace(USER_A, {
          name: 'Valid Name',
          customInstructions: longInstructions,
        });
      },
      (err: any) => err instanceof WorkspaceValidationError && err.statusCode === 400
    );

    // Custom instructions up to 4000 chars accepted
    const valid4kInstructions = 'I'.repeat(4000);
    const ws4k = await service.createWorkspace(USER_A, {
      name: 'Valid 4000 Instructions',
      customInstructions: valid4kInstructions,
    });
    assert.strictEqual(ws4k.customInstructions.length, 4000);
  });

  await t.test('2. Two-User Strict Isolation', async () => {
    store.clear();

    // User A creates 2 workspaces
    const wsA1 = await service.createWorkspace(USER_A, { name: 'Alpha Secret Plan' });
    const wsA2 = await service.createWorkspace(USER_A, { name: 'Alpha Tax 2026' });

    // User B creates 1 workspace
    const wsB1 = await service.createWorkspace(USER_B, { name: 'Beta Project Apollo' });

    // Listing User A workspaces
    const listA = await service.listWorkspaces(USER_A);
    assert.strictEqual(listA.length, 2);
    assert.ok(listA.some((w) => w.id === wsA1.id));
    assert.ok(listA.some((w) => w.id === wsA2.id));
    assert.ok(!listA.some((w) => w.id === wsB1.id), 'User A must NEVER see User B workspace');
    // Verify DTO has no ownerId in list results
    assert.strictEqual((listA[0] as any).ownerId, undefined);

    // Listing User B workspaces
    const listB = await service.listWorkspaces(USER_B);
    assert.strictEqual(listB.length, 1);
    assert.strictEqual(listB[0].id, wsB1.id);
    assert.ok(!listB.some((w) => w.id === wsA1.id), 'User B must NEVER see User A workspace');

    // User B attempts to read User A workspace directly -> 404
    await assert.rejects(
      async () => {
        await service.getWorkspace(USER_B, wsA1.id);
      },
      (err: any) => err instanceof WorkspaceNotFoundError && err.statusCode === 404
    );

    // User B attempts to update User A workspace -> 404
    await assert.rejects(
      async () => {
        await service.updateWorkspace(USER_B, wsA1.id, { name: 'Hacked by B' });
      },
      (err: any) => err instanceof WorkspaceNotFoundError && err.statusCode === 404
    );

    // Confirm User A workspace was not modified
    const verifiedA1 = await service.getWorkspace(USER_A, wsA1.id);
    assert.strictEqual(verifiedA1.name, 'Alpha Secret Plan');

    // User B attempts to delete User A workspace -> 404
    await assert.rejects(
      async () => {
        await service.deleteWorkspace(USER_B, wsA1.id);
      },
      (err: any) => err instanceof WorkspaceNotFoundError && err.statusCode === 404
    );

    // Confirm User A workspace still exists
    const stillExistsA1 = await service.getWorkspace(USER_A, wsA1.id);
    assert.ok(stillExistsA1);
  });

  await t.test('3. Bounded Query Limit (max 50)', async () => {
    store.clear();
    const USER_BULK = 'user_bulk_limit';

    // Create 55 workspaces
    for (let i = 1; i <= 55; i++) {
      await service.createWorkspace(USER_BULK, { name: `Workspace ${i}` });
    }

    const listed = await service.listWorkspaces(USER_BULK);
    assert.strictEqual(listed.length, 50, 'listWorkspaces must cap results at exactly 50');
  });

  await t.test('4. Recursive Subcollection Deletion', async () => {
    store.clear();
    const ws = await service.createWorkspace(USER_A, { name: 'Workspace with messages' });

    // Simulate subcollection messages in store
    store.addMessageFixture(USER_A, ws.id, 'msg_1', { id: 'msg_1', role: 'user', content: 'Hello' });
    store.addMessageFixture(USER_A, ws.id, 'msg_2', { id: 'msg_2', role: 'assistant', content: 'Hi there' });
    assert.strictEqual(store.listMessagesFixture(USER_A, ws.id).length, 2);

    // Deleting workspace must clean up all messages
    await service.deleteWorkspace(USER_A, ws.id);
    assert.strictEqual(store.listMessagesFixture(USER_A, ws.id).length, 0, 'Messages subcollection must be deleted recursively');
  });

  await t.test('5. Payload Strict Validation & Ownership Spoofing Rejection', () => {
    // Unknown field rejection
    assert.throws(
      () => validateStrictBody({ name: 'Valid', unknownProp: 'bad' }, false),
      (err: any) => err instanceof WorkspaceValidationError && err.statusCode === 400
    );

    // Spoofed ownerId rejection (400 Bad Request)
    assert.throws(
      () => validateStrictBody({ name: 'Valid', ownerId: 'victim_user' }, false),
      (err: any) => err instanceof WorkspaceValidationError && err.statusCode === 400
    );

    // Spoofed uid rejection (400 Bad Request)
    assert.throws(
      () => validateStrictBody({ name: 'Valid', uid: 'victim_user' }, false),
      (err: any) => err instanceof WorkspaceValidationError && err.statusCode === 400
    );

    // Spoofed createdAt/updatedAt rejection
    assert.throws(
      () => validateStrictBody({ name: 'Valid', createdAt: '2026-01-01' }, false),
      (err: any) => err instanceof WorkspaceValidationError && err.statusCode === 400
    );

    // Prototype pollution attempt rejection
    assert.throws(
      () => validateStrictBody(JSON.parse('{"name":"Valid","__proto__":{"polluted":true}}'), false),
      (err: any) => err instanceof WorkspaceValidationError && err.statusCode === 400
    );
  });
});

test('Workspace HTTP Endpoints with Real Router Factory', async () => {
  const store = new InMemoryWorkspaceStore();
  const service = new WorkspaceService(store);

  const app = express();
  app.use(express.json());

  // Test auth simulation state
  let currentAuthUser: { uid: string; email: string } | null = null;

  // Mount requireFirebaseAuth simulation middleware
  const testAuthMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!currentAuthUser) {
      return res.status(401).json({
        status: 'error',
        statusCode: 401,
        code: 'UNAUTHORIZED',
        error: 'Authentication required.',
      });
    }
    (req as any).authUser = currentAuthUser;
    next();
  };

  // Mount the REAL production router factory
  app.use('/api/ai-workspace', testAuthMiddleware, createAiWorkspaceRouter(service));

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 1. Unauthenticated request -> 401
    currentAuthUser = null;
    const unauthRes = await fetch(`${baseUrl}/api/ai-workspace/workspaces`);
    assert.strictEqual(unauthRes.status, 401);
    const unauthData = await unauthRes.json();
    assert.strictEqual(unauthData.code, 'UNAUTHORIZED');

    // 2. Authenticated as User 1 -> create workspace
    currentAuthUser = { uid: 'user_1_test', email: 'user1@test.com' };
    const createRes = await fetch(`${baseUrl}/api/ai-workspace/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Financial Work', customInstructions: 'Analyze numbers' }),
    });
    assert.strictEqual(createRes.status, 201);
    const createdData = await createRes.json();
    assert.ok(createdData.workspace.id);
    assert.strictEqual(createdData.workspace.name, 'Financial Work');
    // Ensure ownerId and uid are EXCLUDED from API response
    assert.strictEqual(createdData.workspace.ownerId, undefined, 'API must not expose ownerId');
    assert.strictEqual(createdData.workspace.uid, undefined, 'API must not expose uid');
    const wsId = createdData.workspace.id;

    // 3. Ownership spoofing in POST request must return 400 Bad Request
    const spoofPostRes = await fetch(`${baseUrl}/api/ai-workspace/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacked', ownerId: 'other_user' }),
    });
    assert.strictEqual(spoofPostRes.status, 400, 'Ownership spoofing in POST must return 400');
    const spoofPostData = await spoofPostRes.json();
    assert.strictEqual(spoofPostData.code, 'INVALID_WORKSPACE_DATA');

    // 4. Unknown field in PATCH request must return 400 Bad Request
    const spoofPatchRes = await fetch(`${baseUrl}/api/ai-workspace/workspaces/${wsId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Valid', hackerField: 'malicious' }),
    });
    assert.strictEqual(spoofPatchRes.status, 400, 'Unknown fields in PATCH must return 400');

    // 5. User 1 can list their workspace
    const listRes = await fetch(`${baseUrl}/api/ai-workspace/workspaces`);
    assert.strictEqual(listRes.status, 200);
    const listData = await listRes.json();
    assert.strictEqual(listData.workspaces.length, 1);
    assert.strictEqual(listData.workspaces[0].id, wsId);
    assert.strictEqual(listData.workspaces[0].ownerId, undefined, 'Listed workspace must not expose ownerId');

    // 6. User 2 switches in -> list is empty (strict isolation)
    currentAuthUser = { uid: 'user_2_test', email: 'user2@test.com' };
    const listRes2 = await fetch(`${baseUrl}/api/ai-workspace/workspaces`);
    assert.strictEqual(listRes2.status, 200);
    const listData2 = await listRes2.json();
    assert.strictEqual(listData2.workspaces.length, 0);

    // 7. User 2 tries to GET User 1's workspace -> 404
    const getRes = await fetch(`${baseUrl}/api/ai-workspace/workspaces/${wsId}`);
    assert.strictEqual(getRes.status, 404);
    const getData = await getRes.json();
    assert.strictEqual(getData.code, 'WORKSPACE_NOT_FOUND');

    // 8. User 2 tries to PATCH User 1's workspace -> 404
    const patchRes = await fetch(`${baseUrl}/api/ai-workspace/workspaces/${wsId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Stolen' }),
    });
    assert.strictEqual(patchRes.status, 404);

    // 9. User 2 tries to DELETE User 1's workspace -> 404
    const delRes = await fetch(`${baseUrl}/api/ai-workspace/workspaces/${wsId}`, {
      method: 'DELETE',
    });
    assert.strictEqual(delRes.status, 404);

    // 10. User 1 switches back -> renames and updates custom instructions
    currentAuthUser = { uid: 'user_1_test', email: 'user1@test.com' };
    const updateRes = await fetch(`${baseUrl}/api/ai-workspace/workspaces/${wsId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Financial Work Renamed',
        customInstructions: 'Focus on quarterly EBITDA',
      }),
    });
    assert.strictEqual(updateRes.status, 200);
    const updatedData = await updateRes.json();
    assert.strictEqual(updatedData.workspace.name, 'Financial Work Renamed');
    assert.strictEqual(updatedData.workspace.customInstructions, 'Focus on quarterly EBITDA');
    assert.strictEqual(updatedData.workspace.ownerId, undefined, 'Updated workspace must not expose ownerId');

    // 11. User 1 deletes their workspace -> 200
    const deleteRes = await fetch(`${baseUrl}/api/ai-workspace/workspaces/${wsId}`, {
      method: 'DELETE',
    });
    assert.strictEqual(deleteRes.status, 200);

    // 12. Confirm deletion -> 404
    const getAfterDelete = await fetch(`${baseUrl}/api/ai-workspace/workspaces/${wsId}`);
    assert.strictEqual(getAfterDelete.status, 404);
  } finally {
    server.close();
  }
});

test('Persistence Unavailable (503) Safe Error Handling', async () => {
  // A failing store simulating Firestore outage or network failure
  const failingStore = {
    async create() {
      throw new WorkspacePersistenceError('Firestore connection refused');
    },
    async list() {
      throw new WorkspacePersistenceError('Firestore timeout');
    },
    async get() {
      throw new WorkspacePersistenceError('Firestore permission-denied');
    },
    async update() {
      throw new WorkspacePersistenceError('Firestore deadline-exceeded');
    },
    async delete() {
      throw new WorkspacePersistenceError('Firestore unavailable');
    },
  };

  const failingService = new WorkspaceService(failingStore as any);
  const app = express();
  app.use(express.json());

  // Attach auth user
  app.use((req, _res, next) => {
    (req as any).authUser = { uid: 'test_user_error' };
    next();
  });

  app.use('/api/ai-workspace', createAiWorkspaceRouter(failingService));

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // List workspaces when Firestore fails -> 503 PERSISTENCE_UNAVAILABLE
    const listRes = await fetch(`${baseUrl}/api/ai-workspace/workspaces`);
    assert.strictEqual(listRes.status, 503);
    const listData = await listRes.json();
    assert.strictEqual(listData.code, 'PERSISTENCE_UNAVAILABLE');
    assert.strictEqual(listData.error, 'Workspace storage is temporarily unavailable.');
    assert.strictEqual((listData as any).stack, undefined, 'Stack trace must not be exposed');
    assert.strictEqual((listData as any).projectId, undefined, 'Project ID must not be exposed');

    // Create workspace when Firestore fails -> 503 PERSISTENCE_UNAVAILABLE
    const createRes = await fetch(`${baseUrl}/api/ai-workspace/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    });
    assert.strictEqual(createRes.status, 503);
    const createData = await createRes.json();
    assert.strictEqual(createData.code, 'PERSISTENCE_UNAVAILABLE');
    assert.strictEqual(createData.error, 'Workspace storage is temporarily unavailable.');
  } finally {
    server.close();
  }
});
