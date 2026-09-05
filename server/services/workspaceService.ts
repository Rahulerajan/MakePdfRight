/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { getFirebaseFirestore } from './firebaseAdmin';
import { LoggingService } from './LoggingService';

/**
 * Internal Firestore document format stored in `/users/{userId}/workspaces/{workspaceId}`.
 * Strictly separate from public API DTOs.
 */
export interface WorkspaceDocument {
  id: string;
  name: string;
  ownerId: string;
  customInstructions: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Public Workspace API Data Transfer Object (DTO).
 * NEVER includes ownerId, ownerUid, uid, or database internal metadata.
 */
export interface WorkspaceDto {
  id: string;
  name: string;
  customInstructions: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceInput {
  name: unknown;
  customInstructions?: unknown;
}

export interface UpdateWorkspaceInput {
  name?: unknown;
  customInstructions?: unknown;
}

export class WorkspaceValidationError extends Error {
  readonly code = 'INVALID_WORKSPACE_DATA';
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = 'WorkspaceValidationError';
    Object.setPrototypeOf(this, WorkspaceValidationError.prototype);
  }
}

export class WorkspaceNotFoundError extends Error {
  readonly code = 'WORKSPACE_NOT_FOUND';
  readonly statusCode = 404;

  constructor(message: string = 'Workspace not found.') {
    super(message);
    this.name = 'WorkspaceNotFoundError';
    Object.setPrototypeOf(this, WorkspaceNotFoundError.prototype);
  }
}

export class WorkspacePersistenceError extends Error {
  readonly code = 'PERSISTENCE_UNAVAILABLE';
  readonly statusCode = 503;

  constructor(message: string = 'Workspace storage is temporarily unavailable.') {
    super(message);
    this.name = 'WorkspacePersistenceError';
    Object.setPrototypeOf(this, WorkspacePersistenceError.prototype);
  }
}

const ALLOWED_BODY_FIELDS = new Set(['name', 'customInstructions']);

/**
 * Strict request body validation.
 * Rejects unknown fields, prototype tampering, and spoofing attempts with HTTP 400.
 */
export function validateStrictBody(body: unknown, isPatch = false): void {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new WorkspaceValidationError('Request body must be a valid JSON object.');
  }

  // Reject prototype poisoning attempts
  if (
    Object.prototype.hasOwnProperty.call(body, '__proto__') ||
    Object.prototype.hasOwnProperty.call(body, 'constructor') ||
    Object.prototype.hasOwnProperty.call(body, 'prototype')
  ) {
    throw new WorkspaceValidationError('Disallowed property in request body.');
  }

  const keys = Object.keys(body);
  for (const key of keys) {
    if (!ALLOWED_BODY_FIELDS.has(key)) {
      throw new WorkspaceValidationError(`Unknown or disallowed field: '${key}'.`);
    }
  }

  if (!isPatch) {
    if (!('name' in body) || (body as any).name === undefined || (body as any).name === null) {
      throw new WorkspaceValidationError("Field 'name' is required.");
    }
  } else {
    if (keys.length === 0) {
      throw new WorkspaceValidationError("At least one field ('name' or 'customInstructions') must be provided.");
    }
  }
}

/**
 * Converts a native Firestore Timestamp or compatible timestamp object into an ISO string.
 */
export function timestampToIso(ts: unknown): string {
  if (ts instanceof Timestamp) {
    return ts.toDate().toISOString();
  }
  if (ts && typeof (ts as any).toDate === 'function') {
    return (ts as any).toDate().toISOString();
  }
  if (ts instanceof Date) {
    return ts.toISOString();
  }
  if (typeof ts === 'string') {
    return new Date(ts).toISOString();
  }
  if (typeof ts === 'number') {
    return new Date(ts).toISOString();
  }
  return new Date().toISOString();
}

/**
 * Converts an internal WorkspaceDocument to a public WorkspaceDto,
 * guaranteeing no exposure of user UIDs, owner IDs, or internal database metadata.
 */
export function toWorkspaceDto(doc: WorkspaceDocument): WorkspaceDto {
  return {
    id: doc.id,
    name: doc.name,
    customInstructions: doc.customInstructions || '',
    createdAt: timestampToIso(doc.createdAt),
    updatedAt: timestampToIso(doc.updatedAt),
  };
}

export interface IWorkspaceStore {
  create(workspace: WorkspaceDocument): Promise<WorkspaceDocument>;
  list(userId: string): Promise<WorkspaceDocument[]>;
  get(userId: string, workspaceId: string): Promise<WorkspaceDocument | null>;
  update(
    userId: string,
    workspaceId: string,
    updates: { name?: string; customInstructions?: string; updatedAt: Timestamp }
  ): Promise<WorkspaceDocument>;
  delete(userId: string, workspaceId: string): Promise<boolean>;
}

/**
 * Production store backing workspaces in Cloud Firestore.
 * Subcollection partition: /users/{userId}/workspaces/{workspaceId}
 */
export class FirestoreWorkspaceStore implements IWorkspaceStore {
  private firestoreProvider: () => Firestore;

  constructor(firestoreProvider: () => Firestore = getFirebaseFirestore) {
    this.firestoreProvider = firestoreProvider;
  }

  private getCollection(userId: string) {
    try {
      const db = this.firestoreProvider();
      return db.collection('users').doc(userId).collection('workspaces');
    } catch {
      throw new WorkspacePersistenceError();
    }
  }

  async create(workspace: WorkspaceDocument): Promise<WorkspaceDocument> {
    try {
      const docRef = this.getCollection(workspace.ownerId).doc(workspace.id);
      await docRef.set(workspace);
      return workspace;
    } catch (err) {
      if (err instanceof WorkspaceValidationError || err instanceof WorkspaceNotFoundError) {
        throw err;
      }
      throw new WorkspacePersistenceError();
    }
  }

  async list(userId: string): Promise<WorkspaceDocument[]> {
    try {
      const snapshot = await this.getCollection(userId)
        .orderBy('updatedAt', 'desc')
        .limit(50)
        .get();
      const workspaces: WorkspaceDocument[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as WorkspaceDocument;
        if (data && data.ownerId === userId) {
          workspaces.push(data);
        }
      });
      return workspaces;
    } catch (err) {
      if (err instanceof WorkspaceValidationError || err instanceof WorkspaceNotFoundError) {
        throw err;
      }
      throw new WorkspacePersistenceError();
    }
  }

  async get(userId: string, workspaceId: string): Promise<WorkspaceDocument | null> {
    try {
      const docRef = this.getCollection(userId).doc(workspaceId);
      const doc = await docRef.get();
      if (!doc.exists) {
        return null;
      }
      const data = doc.data() as WorkspaceDocument;
      if (!data || data.ownerId !== userId) {
        return null;
      }
      return data;
    } catch (err) {
      if (err instanceof WorkspaceValidationError || err instanceof WorkspaceNotFoundError) {
        throw err;
      }
      throw new WorkspacePersistenceError();
    }
  }

  async update(
    userId: string,
    workspaceId: string,
    updates: { name?: string; customInstructions?: string; updatedAt: Timestamp }
  ): Promise<WorkspaceDocument> {
    try {
      const docRef = this.getCollection(userId).doc(workspaceId);
      const existing = await this.get(userId, workspaceId);
      if (!existing) {
        throw new WorkspaceNotFoundError();
      }

      const patch: Partial<WorkspaceDocument> = {
        updatedAt: updates.updatedAt,
      };
      if (updates.name !== undefined) patch.name = updates.name;
      if (updates.customInstructions !== undefined) patch.customInstructions = updates.customInstructions;

      await docRef.update(patch);
      return {
        ...existing,
        ...patch,
      };
    } catch (err) {
      if (err instanceof WorkspaceValidationError || err instanceof WorkspaceNotFoundError) {
        throw err;
      }
      throw new WorkspacePersistenceError();
    }
  }

  async delete(userId: string, workspaceId: string): Promise<boolean> {
    try {
      const db = this.firestoreProvider();
      const docRef = this.getCollection(userId).doc(workspaceId);
      const existing = await this.get(userId, workspaceId);
      if (!existing) {
        throw new WorkspaceNotFoundError();
      }

      // Recursively delete the workspace document and all nested collections (e.g. messages)
      if (typeof db.recursiveDelete === 'function') {
        await db.recursiveDelete(docRef);
      } else {
        // Fallback bounded recursive delete for nested collections
        const messagesSnapshot = await docRef.collection('messages').get();
        const batch = db.batch();
        messagesSnapshot.forEach((mDoc) => batch.delete(mDoc.ref));
        batch.delete(docRef);
        await batch.commit();
      }
      return true;
    } catch (err) {
      if (err instanceof WorkspaceValidationError || err instanceof WorkspaceNotFoundError) {
        throw err;
      }
      throw new WorkspacePersistenceError();
    }
  }
}

/**
 * In-memory store for isolated, hermetic unit tests.
 * Reproduces native Timestamp and bounded query (limit 50) behavior.
 */
export class InMemoryWorkspaceStore implements IWorkspaceStore {
  private userStores = new Map<string, Map<string, WorkspaceDocument>>();
  private subcollections = new Map<string, Map<string, any>>();

  private getStore(userId: string): Map<string, WorkspaceDocument> {
    let store = this.userStores.get(userId);
    if (!store) {
      store = new Map();
      this.userStores.set(userId, store);
    }
    return store;
  }

  private getSubcollectionKey(userId: string, workspaceId: string): string {
    return `${userId}:${workspaceId}`;
  }

  /**
   * Helper fixture method for tests to simulate nested messages in subcollections.
   */
  addMessageFixture(userId: string, workspaceId: string, messageId: string, data: any): void {
    const key = this.getSubcollectionKey(userId, workspaceId);
    let sub = this.subcollections.get(key);
    if (!sub) {
      sub = new Map();
      this.subcollections.set(key, sub);
    }
    sub.set(messageId, data);
  }

  /**
   * Helper fixture method for tests to verify nested message fixtures.
   */
  getMessageFixture(userId: string, workspaceId: string, messageId: string): any | null {
    const key = this.getSubcollectionKey(userId, workspaceId);
    return this.subcollections.get(key)?.get(messageId) || null;
  }

  /**
   * Helper fixture method for tests to list all messages in a workspace.
   */
  listMessagesFixture(userId: string, workspaceId: string): any[] {
    const key = this.getSubcollectionKey(userId, workspaceId);
    const sub = this.subcollections.get(key);
    return sub ? Array.from(sub.values()) : [];
  }

  async create(workspace: WorkspaceDocument): Promise<WorkspaceDocument> {
    const store = this.getStore(workspace.ownerId);
    store.set(workspace.id, { ...workspace });
    return { ...workspace };
  }

  async list(userId: string): Promise<WorkspaceDocument[]> {
    const store = this.getStore(userId);
    return Array.from(store.values())
      .sort((a, b) => {
        const timeA = a.updatedAt instanceof Timestamp ? a.updatedAt.toMillis() : new Date(a.updatedAt as any).getTime();
        const timeB = b.updatedAt instanceof Timestamp ? b.updatedAt.toMillis() : new Date(b.updatedAt as any).getTime();
        return timeB - timeA;
      })
      .slice(0, 50);
  }

  async get(userId: string, workspaceId: string): Promise<WorkspaceDocument | null> {
    const store = this.getStore(userId);
    const ws = store.get(workspaceId);
    return ws ? { ...ws } : null;
  }

  async update(
    userId: string,
    workspaceId: string,
    updates: { name?: string; customInstructions?: string; updatedAt: Timestamp }
  ): Promise<WorkspaceDocument> {
    const store = this.getStore(userId);
    const existing = store.get(workspaceId);
    if (!existing || existing.ownerId !== userId) {
      throw new WorkspaceNotFoundError();
    }
    const updated: WorkspaceDocument = {
      ...existing,
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.customInstructions !== undefined ? { customInstructions: updates.customInstructions } : {}),
      updatedAt: updates.updatedAt,
    };
    store.set(workspaceId, updated);
    return { ...updated };
  }

  async delete(userId: string, workspaceId: string): Promise<boolean> {
    const store = this.getStore(userId);
    const existing = store.get(workspaceId);
    if (!existing || existing.ownerId !== userId) {
      throw new WorkspaceNotFoundError();
    }
    // Delete workspace document
    store.delete(workspaceId);
    // Recursively delete all nested subcollections
    const key = this.getSubcollectionKey(userId, workspaceId);
    this.subcollections.delete(key);
    return true;
  }

  clear(): void {
    this.userStores.clear();
    this.subcollections.clear();
  }
}

export class WorkspaceService {
  private store: IWorkspaceStore;

  constructor(store?: IWorkspaceStore) {
    if (store) {
      this.store = store;
    } else if (process.env.WORKSPACE_STORE === 'memory' || process.env.NODE_ENV === 'test') {
      this.store = new InMemoryWorkspaceStore();
    } else {
      this.store = new FirestoreWorkspaceStore();
    }
  }

  setStore(store: IWorkspaceStore): void {
    this.store = store;
  }

  getStore(): IWorkspaceStore {
    return this.store;
  }

  private validateUserId(userId: unknown): string {
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      throw new WorkspaceValidationError('Authenticated user ID is required.');
    }
    return userId.trim();
  }

  private validateWorkspaceId(id: unknown): string {
    if (!id || typeof id !== 'string' || id.length < 1 || id.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new WorkspaceValidationError('Invalid workspace ID format. Must be 1-128 alphanumeric, hyphen, or underscore characters.');
    }
    return id;
  }

  private validateWorkspaceName(name: unknown): string {
    if (typeof name !== 'string') {
      throw new WorkspaceValidationError('Workspace name is required and must be a string.');
    }
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 100) {
      throw new WorkspaceValidationError('Workspace name must be between 1 and 100 characters.');
    }
    return trimmed;
  }

  private validateCustomInstructions(instructions: unknown): string {
    if (instructions === undefined || instructions === null) {
      return '';
    }
    if (typeof instructions !== 'string') {
      throw new WorkspaceValidationError('Custom instructions must be a string.');
    }
    if (instructions.length > 4000) {
      throw new WorkspaceValidationError('Custom instructions cannot exceed 4000 characters.');
    }
    return instructions;
  }

  /**
   * Creates a new workspace belonging strictly to the authenticated user.
   * Uses native Firestore Timestamp for createdAt and updatedAt.
   * Returns a sanitized WorkspaceDto (no UIDs).
   */
  async createWorkspace(userId: string, input: CreateWorkspaceInput): Promise<WorkspaceDto> {
    const validUserId = this.validateUserId(userId);
    const validName = this.validateWorkspaceName(input?.name);
    const validInstructions = this.validateCustomInstructions(input?.customInstructions);

    const now = Timestamp.now();
    const doc: WorkspaceDocument = {
      id: crypto.randomUUID(),
      name: validName,
      ownerId: validUserId,
      customInstructions: validInstructions,
      createdAt: now,
      updatedAt: now,
    };

    LoggingService.info('[WorkspaceService] Workspace created successfully');
    const created = await this.store.create(doc);
    return toWorkspaceDto(created);
  }

  /**
   * Lists all workspaces belonging exclusively to the authenticated user.
   * Bounded to a maximum of 50 items ordered by updatedAt desc.
   * Returns sanitized WorkspaceDto array.
   */
  async listWorkspaces(userId: string): Promise<WorkspaceDto[]> {
    const validUserId = this.validateUserId(userId);
    const docs = await this.store.list(validUserId);
    return docs.map(toWorkspaceDto);
  }

  /**
   * Gets a specific workspace belonging exclusively to the authenticated user.
   * Returns sanitized WorkspaceDto.
   */
  async getWorkspace(userId: string, workspaceId: string): Promise<WorkspaceDto> {
    const validUserId = this.validateUserId(userId);
    const validId = this.validateWorkspaceId(workspaceId);

    const doc = await this.store.get(validUserId, validId);
    if (!doc) {
      throw new WorkspaceNotFoundError();
    }
    return toWorkspaceDto(doc);
  }

  /**
   * Updates a workspace's name and/or custom instructions.
   * Updates updatedAt using native Firestore Timestamp.
   * Returns sanitized WorkspaceDto.
   */
  async updateWorkspace(
    userId: string,
    workspaceId: string,
    updates: UpdateWorkspaceInput
  ): Promise<WorkspaceDto> {
    const validUserId = this.validateUserId(userId);
    const validId = this.validateWorkspaceId(workspaceId);

    if (!updates || (updates.name === undefined && updates.customInstructions === undefined)) {
      throw new WorkspaceValidationError("At least one field ('name' or 'customInstructions') must be provided.");
    }

    const patch: { name?: string; customInstructions?: string; updatedAt: Timestamp } = {
      updatedAt: Timestamp.now(),
    };

    if (updates.name !== undefined) {
      patch.name = this.validateWorkspaceName(updates.name);
    }
    if (updates.customInstructions !== undefined) {
      patch.customInstructions = this.validateCustomInstructions(updates.customInstructions);
    }

    const updated = await this.store.update(validUserId, validId, patch);
    return toWorkspaceDto(updated);
  }

  /**
   * Deletes a workspace and recursively all nested subcollections.
   */
  async deleteWorkspace(userId: string, workspaceId: string): Promise<boolean> {
    const validUserId = this.validateUserId(userId);
    const validId = this.validateWorkspaceId(workspaceId);

    LoggingService.info('[WorkspaceService] Workspace deleted successfully');
    return this.store.delete(validUserId, validId);
  }
}

export const workspaceService = new WorkspaceService();
