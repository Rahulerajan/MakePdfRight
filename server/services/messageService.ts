/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { Timestamp, FieldValue, type Firestore } from 'firebase-admin/firestore';
import { getFirebaseFirestore } from './firebaseAdmin';
import { LoggingService } from './LoggingService';
import { timestampToIso, WorkspaceNotFoundError, WorkspacePersistenceError } from './workspaceService';

export interface AttachmentMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  sha256: string;
}

export interface MessageDocument {
  id: string;
  requestId: string;
  role: 'user' | 'model';
  text: string;
  status: 'pending' | 'complete' | 'failed';
  modelUsed: string | null;
  safeErrorCode: string | null;
  attachment: AttachmentMetadata | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MessageWriteDocument {
  id: string;
  requestId: string;
  role: 'user' | 'model';
  text: string;
  status: 'pending' | 'complete' | 'failed';
  modelUsed: string | null;
  safeErrorCode: string | null;
  attachment: AttachmentMetadata | null;
  createdAt: FieldValue | Timestamp;
  updatedAt: FieldValue | Timestamp;
}

export interface RequestLedgerDocument {
  requestId: string;
  workspaceId: string;
  userId: string;
  status: 'in_progress' | 'complete' | 'failed';
  userMessageId: string;
  modelMessageId: string | null;
  createdAt: FieldValue | Timestamp;
  updatedAt: FieldValue | Timestamp;
}

export type IdempotencyClaimResult =
  | { type: 'claimed'; userMessage: MessageDocument }
  | { type: 'retry_claimed'; userMessage: MessageDocument }
  | { type: 'in_progress'; existingUserMessageId?: string }
  | { type: 'complete'; userMessage: MessageDocument; modelMessage: MessageDocument };

/**
 * Public Message Data Transfer Object.
 * Strictly excludes any UIDs, owner IDs, or database internal paths.
 */
export interface MessageDto {
  id: string;
  requestId: string;
  role: 'user' | 'model';
  text: string;
  status: 'pending' | 'complete' | 'failed';
  modelUsed: string | null;
  safeErrorCode: string | null;
  attachment: AttachmentMetadata | null;
  createdAt: string;
  updatedAt: string;
}

export class MessageValidationError extends Error {
  readonly code: string;
  readonly statusCode = 400;

  constructor(message: string, code: string = 'INVALID_MESSAGE') {
    super(message);
    this.name = 'MessageValidationError';
    this.code = code;
    Object.setPrototypeOf(this, MessageValidationError.prototype);
  }
}

export class MessageConflictError extends Error {
  readonly code = 'REQUEST_IN_PROGRESS';
  readonly statusCode = 409;

  constructor(message: string = 'A request with this requestId is currently in progress.') {
    super(message);
    this.name = 'MessageConflictError';
    Object.setPrototypeOf(this, MessageConflictError.prototype);
  }
}

export function toMessageDto(doc: MessageDocument): MessageDto {
  return {
    id: doc.id,
    requestId: doc.requestId,
    role: doc.role,
    text: doc.text,
    status: doc.status,
    modelUsed: doc.modelUsed,
    safeErrorCode: doc.safeErrorCode,
    attachment: doc.attachment ? { ...doc.attachment } : null,
    createdAt: timestampToIso(doc.createdAt),
    updatedAt: timestampToIso(doc.updatedAt),
  };
}

export interface ValidatedPdfDocument {
  fileName: string;
  fileSize: number;
  mimeType: 'application/pdf';
  sha256: string;
  base64Data: string;
}

/**
 * Enforces strict schema on document attachments:
 * { fileName: string, fileSize: number, mimeType: 'application/pdf', sha256: string, data: string }
 *
 * Rejects invalid types, oversize payloads (>10MB), non-matching sha256 checksums,
 * mismatched declared size, malformed base64, or invalid PDF magic bytes (%PDF-).
 */
export function validateAndParsePdfDocument(docInput: unknown): ValidatedPdfDocument {
  if (!docInput || typeof docInput !== 'object' || Array.isArray(docInput)) {
    throw new MessageValidationError('Invalid document structure. Expected an object.', 'INVALID_DOCUMENT');
  }

  const allowedDocKeys = new Set(['fileName', 'fileSize', 'mimeType', 'sha256', 'data']);
  for (const k of Object.keys(docInput)) {
    if (!allowedDocKeys.has(k)) {
      throw new MessageValidationError(`Disallowed field in document: '${k}'.`, 'INVALID_DOCUMENT');
    }
  }

  const { fileName, fileSize, mimeType, sha256, data } = docInput as any;

  if (typeof fileName !== 'string' || !fileName.trim() || fileName.length > 255 || !fileName.toLowerCase().endsWith('.pdf')) {
    throw new MessageValidationError('Invalid or missing document fileName. Must end with .pdf and not exceed 255 characters.', 'INVALID_DOCUMENT');
  }

  if (typeof mimeType !== 'string' || mimeType.toLowerCase() !== 'application/pdf') {
    throw new MessageValidationError('Only application/pdf documents are permitted.', 'INVALID_DOCUMENT');
  }

  if (sha256 !== undefined) {
    if (typeof sha256 !== 'string' || !/^[a-fA-F0-9]{64}$/.test(sha256)) {
      throw new MessageValidationError('Invalid sha256 checksum. Must be a 64-character hex string.', 'INVALID_DOCUMENT');
    }
  }

  if (typeof data !== 'string' || !data.trim()) {
    throw new MessageValidationError('Missing document base64 data.', 'INVALID_DOCUMENT');
  }

  // Remove potential data URI prefix
  const cleanBase64 = data.replace(/^data:application\/pdf;base64,/i, '').trim();

  // Validate base64 structure
  if (!/^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
    throw new MessageValidationError('Document data is not valid base64.', 'INVALID_DOCUMENT');
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(cleanBase64, 'base64');
  } catch {
    throw new MessageValidationError('Document data is not valid base64.', 'INVALID_DOCUMENT');
  }

  const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB
  if (buffer.length < 5) {
    throw new MessageValidationError('Document is truncated or empty (< 5 bytes).', 'INVALID_DOCUMENT');
  }

  if (buffer.length > MAX_PDF_BYTES) {
    throw new MessageValidationError(`Document exceeds maximum size of 10 MB (got ${buffer.length} bytes).`, 'INVALID_DOCUMENT');
  }

  // Enforce strict declared fileSize match
  if (typeof fileSize !== 'number' || fileSize !== buffer.length) {
    throw new MessageValidationError(`Declared document fileSize (${fileSize}) does not match decoded byte length (${buffer.length}).`, 'INVALID_DOCUMENT');
  }

  // Magic bytes check: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
  if (
    buffer.length < 5 ||
    buffer[0] !== 0x25 ||
    buffer[1] !== 0x50 ||
    buffer[2] !== 0x44 ||
    buffer[3] !== 0x46 ||
    buffer[4] !== 0x2d
  ) {
    throw new MessageValidationError('Invalid PDF document: missing %PDF- header magic bytes.', 'INVALID_DOCUMENT');
  }

  // Verify SHA-256 integrity match if provided
  const computedSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  if (sha256 && computedSha256.toLowerCase() !== sha256.toLowerCase()) {
    throw new MessageValidationError('Document SHA-256 checksum verification failed.', 'INVALID_DOCUMENT');
  }

  return {
    fileName: fileName.trim(),
    fileSize: buffer.length,
    mimeType: 'application/pdf',
    sha256: computedSha256,
    base64Data: cleanBase64,
  };
}

export interface BuildContextOptions {
  maxMessages?: number;
  maxCharacters?: number;
}

export interface FormattedGeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface BuildContextResult {
  contents: FormattedGeminiContent[];
  retainedCount: number;
  droppedCount: number;
}

/**
 * Builds history context for Gemini multi-turn generation.
 * - Takes at most the latest 20 messages
 * - Preserves chronological order
 * - Drops older messages if exceeding maxCharacters budget (default 30,000 chars)
 * - Never includes pending or failed messages
 * - Logs an info line with the number of retained and dropped messages
 */
export function buildGeminiContext(
  messages: MessageDocument[],
  options: BuildContextOptions = {}
): BuildContextResult {
  const maxMessages = options.maxMessages ?? 20;
  const maxChars = options.maxCharacters ?? 30000;

  // Only include completed messages
  const completed = messages.filter((m) => m.status === 'complete');

  // Limit to latest maxMessages
  const candidates = completed.slice(-maxMessages);

  // Apply character budget from newest to oldest
  const retained: MessageDocument[] = [];
  let currentChars = 0;

  for (let i = candidates.length - 1; i >= 0; i--) {
    const msg = candidates[i];
    const len = msg.text.length;
    if (retained.length === 0 || currentChars + len <= maxChars) {
      retained.unshift(msg);
      currentChars += len;
    } else {
      break;
    }
  }

  const droppedCount = messages.length - retained.length;
  LoggingService.info(`[ContextBuilder] Retained ${retained.length} history messages, dropped ${droppedCount} messages for context window.`);

  const contents: FormattedGeminiContent[] = retained.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  return {
    contents,
    retainedCount: retained.length,
    droppedCount,
  };
}

export interface IMessageStore {
  list(userId: string, workspaceId: string): Promise<MessageDocument[]>;
  findByRequestId(userId: string, workspaceId: string, requestId: string): Promise<MessageDocument | null>;
  findModelMessageByRequestId(userId: string, workspaceId: string, requestId: string): Promise<MessageDocument | null>;
  claimRequest(
    userId: string,
    workspaceId: string,
    params: { text: string; requestId: string; attachment?: AttachmentMetadata | null }
  ): Promise<IdempotencyClaimResult>;
  completeExchange(
    userId: string,
    workspaceId: string,
    userMessageId: string,
    modelMessage: MessageWriteDocument
  ): Promise<{ userMessage: MessageDocument; modelMessage: MessageDocument }>;
  failRequest(
    userId: string,
    workspaceId: string,
    requestId: string,
    userMessageId: string,
    safeErrorCode: string
  ): Promise<MessageDocument>;
}

export class FirestoreMessageStore implements IMessageStore {
  private firestoreProvider: () => Firestore;

  constructor(firestoreProvider: () => Firestore = getFirebaseFirestore) {
    this.firestoreProvider = firestoreProvider;
  }

  private getMessagesCollection(userId: string, workspaceId: string) {
    try {
      const db = this.firestoreProvider();
      return db.collection('users').doc(userId).collection('workspaces').doc(workspaceId).collection('messages');
    } catch {
      throw new WorkspacePersistenceError();
    }
  }

  private getRequestsCollection(userId: string, workspaceId: string) {
    try {
      const db = this.firestoreProvider();
      return db.collection('users').doc(userId).collection('workspaces').doc(workspaceId).collection('requests');
    } catch {
      throw new WorkspacePersistenceError();
    }
  }

  private getWorkspaceRef(userId: string, workspaceId: string) {
    try {
      const db = this.firestoreProvider();
      return db.collection('users').doc(userId).collection('workspaces').doc(workspaceId);
    } catch {
      throw new WorkspacePersistenceError();
    }
  }

  async list(userId: string, workspaceId: string): Promise<MessageDocument[]> {
    try {
      // Query up to 50 latest messages ordered by createdAt desc, then reverse in memory for chronological order
      const snapshot = await this.getMessagesCollection(userId, workspaceId)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      const messages: MessageDocument[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as MessageDocument;
        if (data) {
          messages.push(data);
        }
      });
      return messages.reverse();
    } catch (err) {
      if (err instanceof MessageValidationError || err instanceof WorkspaceNotFoundError) {
        throw err;
      }
      throw new WorkspacePersistenceError();
    }
  }

  async findByRequestId(userId: string, workspaceId: string, requestId: string): Promise<MessageDocument | null> {
    try {
      const snapshot = await this.getMessagesCollection(userId, workspaceId)
        .where('requestId', '==', requestId)
        .limit(2)
        .get();

      if (snapshot.empty) {
        return null;
      }

      for (const doc of snapshot.docs) {
        const data = doc.data() as MessageDocument;
        if (data && data.role === 'user') {
          return data;
        }
      }

      return snapshot.docs[0].data() as MessageDocument;
    } catch {
      throw new WorkspacePersistenceError();
    }
  }

  async findModelMessageByRequestId(userId: string, workspaceId: string, requestId: string): Promise<MessageDocument | null> {
    try {
      const snapshot = await this.getMessagesCollection(userId, workspaceId)
        .where('requestId', '==', requestId)
        .where('role', '==', 'model')
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      return snapshot.docs[0].data() as MessageDocument;
    } catch {
      throw new WorkspacePersistenceError();
    }
  }

  /**
   * Atomic Firestore transaction claim on deterministic ledger document:
   * /users/{userId}/workspaces/{workspaceId}/requests/{requestId}
   *
   * Produces exactly one of:
   * - claimed: newly claimed request;
   * - in_progress: request currently active (caller returns HTTP 409);
   * - complete: request completed; returns stored user & model messages;
   * - retry_claimed: atomically transitions a failed request back to pending.
   */
  async claimRequest(
    userId: string,
    workspaceId: string,
    params: { text: string; requestId: string; attachment?: AttachmentMetadata | null }
  ): Promise<IdempotencyClaimResult> {
    try {
      const db = this.firestoreProvider();
      const reqRef = this.getRequestsCollection(userId, workspaceId).doc(params.requestId);
      const msgsColl = this.getMessagesCollection(userId, workspaceId);

      return await db.runTransaction(async (tx) => {
        const reqSnap = await tx.get(reqRef);

        if (reqSnap.exists) {
          const reqData = reqSnap.data() as RequestLedgerDocument;

          if (reqData.status === 'in_progress') {
            return {
              type: 'in_progress',
              existingUserMessageId: reqData.userMessageId,
            };
          }

          if (reqData.status === 'complete') {
            const userSnap = await tx.get(msgsColl.doc(reqData.userMessageId));
            const modelSnap = reqData.modelMessageId ? await tx.get(msgsColl.doc(reqData.modelMessageId)) : null;

            if (userSnap.exists && modelSnap && modelSnap.exists) {
              return {
                type: 'complete',
                userMessage: userSnap.data() as MessageDocument,
                modelMessage: modelSnap.data() as MessageDocument,
              };
            }
          }

          if (reqData.status === 'failed') {
            // Atomically transition failed request back to in_progress
            const userMsgRef = msgsColl.doc(reqData.userMessageId);
            tx.update(reqRef, {
              status: 'in_progress',
              updatedAt: FieldValue.serverTimestamp(),
            });
            tx.update(userMsgRef, {
              text: params.text,
              status: 'pending',
              safeErrorCode: null,
              attachment: params.attachment || null,
              updatedAt: FieldValue.serverTimestamp(),
            });

            const userDoc: MessageDocument = {
              id: reqData.userMessageId,
              requestId: params.requestId,
              role: 'user',
              text: params.text,
              status: 'pending',
              modelUsed: null,
              safeErrorCode: null,
              attachment: params.attachment || null,
              createdAt: reqData.createdAt as Timestamp,
              updatedAt: Timestamp.now(),
            };

            return {
              type: 'retry_claimed',
              userMessage: userDoc,
            };
          }
        }

        // Brand new claim
        const newUserMessageId = crypto.randomUUID();
        const userMsgRef = msgsColl.doc(newUserMessageId);

        tx.set(reqRef, {
          requestId: params.requestId,
          workspaceId,
          userId,
          status: 'in_progress',
          userMessageId: newUserMessageId,
          modelMessageId: null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        const writeDoc: MessageWriteDocument = {
          id: newUserMessageId,
          requestId: params.requestId,
          role: 'user',
          text: params.text,
          status: 'pending',
          modelUsed: null,
          safeErrorCode: null,
          attachment: params.attachment || null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        tx.set(userMsgRef, writeDoc);

        const userDoc: MessageDocument = {
          id: newUserMessageId,
          requestId: params.requestId,
          role: 'user',
          text: params.text,
          status: 'pending',
          modelUsed: null,
          safeErrorCode: null,
          attachment: params.attachment || null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        return {
          type: 'claimed',
          userMessage: userDoc,
        };
      });
    } catch (err) {
      if (err instanceof MessageValidationError) {
        throw err;
      }
      LoggingService.error('[FirestoreMessageStore] claimRequest failed:', err);
      throw new WorkspacePersistenceError();
    }
  }

  async completeExchange(
    userId: string,
    workspaceId: string,
    userMessageId: string,
    modelMessage: MessageWriteDocument
  ): Promise<{ userMessage: MessageDocument; modelMessage: MessageDocument }> {
    try {
      const db = this.firestoreProvider();
      const coll = this.getMessagesCollection(userId, workspaceId);
      const reqRef = this.getRequestsCollection(userId, workspaceId).doc(modelMessage.requestId);
      const userDocRef = coll.doc(userMessageId);
      const modelDocRef = coll.doc(modelMessage.id);
      const workspaceRef = this.getWorkspaceRef(userId, workspaceId);

      const batch = db.batch();

      // Update ledger to complete
      batch.update(reqRef, {
        status: 'complete',
        modelMessageId: modelMessage.id,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Mark user message complete
      batch.update(userDocRef, {
        status: 'complete',
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Save model message
      batch.set(modelDocRef, {
        ...modelMessage,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Update workspace timestamp
      batch.update(workspaceRef, {
        updatedAt: FieldValue.serverTimestamp(),
      });

      await batch.commit();

      const [userSnap, modelSnap] = await Promise.all([userDocRef.get(), modelDocRef.get()]);

      if (!userSnap.exists || !modelSnap.exists) {
        throw new WorkspacePersistenceError();
      }

      return {
        userMessage: userSnap.data() as MessageDocument,
        modelMessage: modelSnap.data() as MessageDocument,
      };
    } catch (err) {
      if (err instanceof MessageValidationError) {
        throw err;
      }
      LoggingService.error('[FirestoreMessageStore] completeExchange failed:', err);
      throw new WorkspacePersistenceError();
    }
  }

  async failRequest(
    userId: string,
    workspaceId: string,
    requestId: string,
    userMessageId: string,
    safeErrorCode: string
  ): Promise<MessageDocument> {
    try {
      const db = this.firestoreProvider();
      const reqRef = this.getRequestsCollection(userId, workspaceId).doc(requestId);
      const userDocRef = this.getMessagesCollection(userId, workspaceId).doc(userMessageId);

      const batch = db.batch();

      batch.update(reqRef, {
        status: 'failed',
        updatedAt: FieldValue.serverTimestamp(),
      });

      batch.update(userDocRef, {
        status: 'failed',
        safeErrorCode,
        updatedAt: FieldValue.serverTimestamp(),
      });

      await batch.commit();

      const snap = await userDocRef.get();
      if (!snap.exists) {
        throw new WorkspacePersistenceError();
      }
      return snap.data() as MessageDocument;
    } catch (err) {
      if (err instanceof MessageValidationError) {
        throw err;
      }
      LoggingService.error('[FirestoreMessageStore] failRequest failed:', err);
      throw new WorkspacePersistenceError();
    }
  }
}

export class InMemoryMessageStore implements IMessageStore {
  // Key: `${userId}:${workspaceId}` -> Map<messageId, MessageDocument>
  private store = new Map<string, Map<string, MessageDocument>>();
  // Key: `${userId}:${workspaceId}:${requestId}` -> RequestLedgerDocument
  private requestStore = new Map<string, RequestLedgerDocument>();

  private getKey(userId: string, workspaceId: string): string {
    return `${userId}:${workspaceId}`;
  }

  private getRequestKey(userId: string, workspaceId: string, requestId: string): string {
    return `${userId}:${workspaceId}:${requestId}`;
  }

  private getMessagesMap(userId: string, workspaceId: string): Map<string, MessageDocument> {
    const key = this.getKey(userId, workspaceId);
    let map = this.store.get(key);
    if (!map) {
      map = new Map();
      this.store.set(key, map);
    }
    return map;
  }

  async list(userId: string, workspaceId: string): Promise<MessageDocument[]> {
    const map = this.getMessagesMap(userId, workspaceId);
    const all = Array.from(map.values());
    all.sort((a, b) => {
      const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt as any).getTime();
      const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt as any).getTime();
      return timeA - timeB;
    });
    return all.slice(-50);
  }

  async findByRequestId(userId: string, workspaceId: string, requestId: string): Promise<MessageDocument | null> {
    const map = this.getMessagesMap(userId, workspaceId);
    for (const msg of map.values()) {
      if (msg.requestId === requestId && msg.role === 'user') {
        return { ...msg };
      }
    }
    for (const msg of map.values()) {
      if (msg.requestId === requestId) {
        return { ...msg };
      }
    }
    return null;
  }

  async findModelMessageByRequestId(userId: string, workspaceId: string, requestId: string): Promise<MessageDocument | null> {
    const map = this.getMessagesMap(userId, workspaceId);
    for (const msg of map.values()) {
      if (msg.requestId === requestId && msg.role === 'model') {
        return { ...msg };
      }
    }
    return null;
  }

  async claimRequest(
    userId: string,
    workspaceId: string,
    params: { text: string; requestId: string; attachment?: AttachmentMetadata | null }
  ): Promise<IdempotencyClaimResult> {
    const reqKey = this.getRequestKey(userId, workspaceId, params.requestId);
    const existingReq = this.requestStore.get(reqKey);
    const msgsMap = this.getMessagesMap(userId, workspaceId);

    if (existingReq) {
      if (existingReq.status === 'in_progress') {
        return {
          type: 'in_progress',
          existingUserMessageId: existingReq.userMessageId,
        };
      }

      if (existingReq.status === 'complete') {
        const userDoc = msgsMap.get(existingReq.userMessageId);
        const modelDoc = existingReq.modelMessageId ? msgsMap.get(existingReq.modelMessageId) : null;
        if (userDoc && modelDoc) {
          return {
            type: 'complete',
            userMessage: { ...userDoc },
            modelMessage: { ...modelDoc },
          };
        }
      }

      if (existingReq.status === 'failed') {
        // Transition back to in_progress
        existingReq.status = 'in_progress';
        existingReq.updatedAt = Timestamp.now();

        const userDoc = msgsMap.get(existingReq.userMessageId);
        if (userDoc) {
          userDoc.text = params.text;
          userDoc.status = 'pending';
          userDoc.safeErrorCode = null;
          userDoc.attachment = params.attachment ? { ...params.attachment } : null;
          userDoc.updatedAt = Timestamp.now();
          return {
            type: 'retry_claimed',
            userMessage: { ...userDoc },
          };
        }
      }
    }

    // Brand new claim
    const newUserMessageId = crypto.randomUUID();
    const now = Timestamp.now();

    const newReq: RequestLedgerDocument = {
      requestId: params.requestId,
      workspaceId,
      userId,
      status: 'in_progress',
      userMessageId: newUserMessageId,
      modelMessageId: null,
      createdAt: now,
      updatedAt: now,
    };
    this.requestStore.set(reqKey, newReq);

    const userDoc: MessageDocument = {
      id: newUserMessageId,
      requestId: params.requestId,
      role: 'user',
      text: params.text,
      status: 'pending',
      modelUsed: null,
      safeErrorCode: null,
      attachment: params.attachment ? { ...params.attachment } : null,
      createdAt: now,
      updatedAt: now,
    };
    msgsMap.set(newUserMessageId, userDoc);

    return {
      type: 'claimed',
      userMessage: { ...userDoc },
    };
  }

  async completeExchange(
    userId: string,
    workspaceId: string,
    userMessageId: string,
    modelMessage: MessageWriteDocument
  ): Promise<{ userMessage: MessageDocument; modelMessage: MessageDocument }> {
    const msgsMap = this.getMessagesMap(userId, workspaceId);
    const userDoc = msgsMap.get(userMessageId);
    if (!userDoc) {
      throw new WorkspacePersistenceError();
    }

    const now = Timestamp.now();
    userDoc.status = 'complete';
    userDoc.updatedAt = now;

    const resolvedModel: MessageDocument = {
      id: modelMessage.id,
      requestId: modelMessage.requestId,
      role: modelMessage.role,
      text: modelMessage.text,
      status: modelMessage.status,
      modelUsed: modelMessage.modelUsed,
      safeErrorCode: modelMessage.safeErrorCode,
      attachment: modelMessage.attachment ? { ...modelMessage.attachment } : null,
      createdAt: modelMessage.createdAt instanceof Timestamp ? modelMessage.createdAt : now,
      updatedAt: modelMessage.updatedAt instanceof Timestamp ? modelMessage.updatedAt : now,
    };
    msgsMap.set(resolvedModel.id, resolvedModel);

    const reqKey = this.getRequestKey(userId, workspaceId, modelMessage.requestId);
    const req = this.requestStore.get(reqKey);
    if (req) {
      req.status = 'complete';
      req.modelMessageId = resolvedModel.id;
      req.updatedAt = now;
    }

    return {
      userMessage: { ...userDoc },
      modelMessage: { ...resolvedModel },
    };
  }

  async failRequest(
    userId: string,
    workspaceId: string,
    requestId: string,
    userMessageId: string,
    safeErrorCode: string
  ): Promise<MessageDocument> {
    const msgsMap = this.getMessagesMap(userId, workspaceId);
    const userDoc = msgsMap.get(userMessageId);
    if (!userDoc) {
      throw new WorkspacePersistenceError();
    }
    const now = Timestamp.now();
    userDoc.status = 'failed';
    userDoc.safeErrorCode = safeErrorCode;
    userDoc.updatedAt = now;

    const reqKey = this.getRequestKey(userId, workspaceId, requestId);
    const req = this.requestStore.get(reqKey);
    if (req) {
      req.status = 'failed';
      req.updatedAt = now;
    }

    return { ...userDoc };
  }

  clear(): void {
    this.store.clear();
    this.requestStore.clear();
  }
}

export class MessageService {
  private store: IMessageStore;

  constructor(store?: IMessageStore) {
    if (store) {
      this.store = store;
    } else if (process.env.WORKSPACE_STORE === 'memory' || process.env.NODE_ENV === 'test') {
      this.store = new InMemoryMessageStore();
    } else {
      this.store = new FirestoreMessageStore();
    }
  }

  public setStore(store: IMessageStore): void {
    this.store = store;
  }

  public getStore(): IMessageStore {
    return this.store;
  }

  public validateRequestId(requestId: unknown): string {
    if (!requestId || typeof requestId !== 'string') {
      throw new MessageValidationError('Missing or invalid requestId.', 'INVALID_MESSAGE');
    }
    const trimmed = requestId.trim();
    if (trimmed.length < 8 || trimmed.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      throw new MessageValidationError('requestId must be between 8 and 128 alphanumeric, hyphen, or underscore characters.', 'INVALID_MESSAGE');
    }
    return trimmed;
  }

  public validateUserText(text: unknown): string {
    if (typeof text !== 'string') {
      throw new MessageValidationError('Message text must be a string.', 'INVALID_MESSAGE');
    }
    const trimmed = text.trim();
    if (trimmed.length < 1 || trimmed.length > 5000) {
      throw new MessageValidationError('Message text must be between 1 and 5,000 characters.', 'INVALID_MESSAGE');
    }
    return trimmed;
  }

  /**
   * Lists chronological messages for the active workspace (max 50).
   */
  async listMessages(userId: string, workspaceId: string): Promise<MessageDto[]> {
    const docs = await this.store.list(userId, workspaceId);
    return docs.map(toMessageDto);
  }

  /**
   * Raw message documents for internal context building.
   */
  async listRawMessages(userId: string, workspaceId: string): Promise<MessageDocument[]> {
    return this.store.list(userId, workspaceId);
  }

  /**
   * Atomic claim on the deterministic ledger document.
   */
  async claimRequest(
    userId: string,
    workspaceId: string,
    params: { text: string; requestId: string; attachment?: AttachmentMetadata | null }
  ): Promise<IdempotencyClaimResult> {
    const validText = this.validateUserText(params.text);
    const validRequestId = this.validateRequestId(params.requestId);

    return this.store.claimRequest(userId, workspaceId, {
      text: validText,
      requestId: validRequestId,
      attachment: params.attachment || null,
    });
  }

  /**
   * Helper to create or claim a pending user message (for unit test compatibility).
   */
  async createPendingUserMessage(
    userId: string,
    workspaceId: string,
    params: { text: string; requestId?: string; attachment?: AttachmentMetadata | null }
  ): Promise<MessageDto> {
    const reqId = params.requestId || crypto.randomUUID();
    const claim = await this.claimRequest(userId, workspaceId, {
      text: params.text,
      requestId: reqId,
      attachment: params.attachment,
    });

    if (claim.type === 'claimed' || claim.type === 'retry_claimed') {
      return toMessageDto(claim.userMessage);
    }
    if (claim.type === 'complete') {
      return toMessageDto(claim.userMessage);
    }
    throw new MessageConflictError('Request already in progress.');
  }

  /**
   * Atomically completes the exchange with model reply and commits both messages.
   */
  async completeExchange(
    userId: string,
    workspaceId: string,
    userMessageId: string,
    params: { text: string; modelUsed: string; requestId: string }
  ): Promise<{ userMessage: MessageDto; modelMessage: MessageDto }> {
    const isMemory = this.store instanceof InMemoryMessageStore;
    const modelWriteDoc: MessageWriteDocument = {
      id: crypto.randomUUID(),
      requestId: params.requestId,
      role: 'model',
      text: params.text.slice(0, 10000),
      status: 'complete',
      modelUsed: params.modelUsed,
      safeErrorCode: null,
      attachment: null,
      createdAt: isMemory ? Timestamp.now() : FieldValue.serverTimestamp(),
      updatedAt: isMemory ? Timestamp.now() : FieldValue.serverTimestamp(),
    };

    const result = await this.store.completeExchange(userId, workspaceId, userMessageId, modelWriteDoc);
    return {
      userMessage: toMessageDto(result.userMessage),
      modelMessage: toMessageDto(result.modelMessage),
    };
  }

  /**
   * Atomically transitions request and user message to failed without clearing prompt text.
   */
  async failRequest(
    userId: string,
    workspaceId: string,
    requestId: string,
    userMessageId: string,
    safeErrorCode: string
  ): Promise<MessageDto> {
    const doc = await this.store.failRequest(userId, workspaceId, requestId, userMessageId, safeErrorCode);
    return toMessageDto(doc);
  }

  async findByRequestId(userId: string, workspaceId: string, rawRequestId: string): Promise<MessageDocument | null> {
    const requestId = this.validateRequestId(rawRequestId);
    return this.store.findByRequestId(userId, workspaceId, requestId);
  }

  async findModelMessageByRequestId(userId: string, workspaceId: string, rawRequestId: string): Promise<MessageDocument | null> {
    const requestId = this.validateRequestId(rawRequestId);
    return this.store.findModelMessageByRequestId(userId, workspaceId, requestId);
  }
}

export const messageService = new MessageService();
