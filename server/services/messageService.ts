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
  mimeType: string;
  sha256: string;
  base64Data: string;
}

/**
 * Validates request-scoped PDF document attachment.
 * Rejects invalid types, oversize payloads (>10MB), malformed base64, or invalid PDF magic bytes.
 */
export function validateAndParsePdfDocument(docInput: unknown): ValidatedPdfDocument {
  if (!docInput || typeof docInput !== 'object' || Array.isArray(docInput)) {
    throw new MessageValidationError('Invalid document structure.', 'INVALID_DOCUMENT');
  }

  const allowedDocKeys = new Set(['fileName', 'fileSize', 'mimeType', 'data']);
  for (const k of Object.keys(docInput)) {
    if (!allowedDocKeys.has(k)) {
      throw new MessageValidationError(`Disallowed field in document: '${k}'.`, 'INVALID_DOCUMENT');
    }
  }

  const { fileName, fileSize, mimeType, data } = docInput as any;

  if (typeof fileName !== 'string' || !fileName.trim() || fileName.length > 255) {
    throw new MessageValidationError('Invalid or missing document fileName.', 'INVALID_DOCUMENT');
  }

  if (typeof mimeType !== 'string' || mimeType.toLowerCase() !== 'application/pdf') {
    throw new MessageValidationError('Only application/pdf documents are permitted.', 'INVALID_DOCUMENT');
  }

  if (typeof data !== 'string' || !data.trim()) {
    throw new MessageValidationError('Missing document base64 data.', 'INVALID_DOCUMENT');
  }

  // Remove potential data URI prefix
  const cleanBase64 = data.replace(/^data:application\/pdf;base64,/i, '').trim();

  let buffer: Buffer;
  try {
    buffer = Buffer.from(cleanBase64, 'base64');
  } catch {
    throw new MessageValidationError('Document data is not valid base64.', 'INVALID_DOCUMENT');
  }

  const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB
  if (buffer.length === 0 || buffer.length > MAX_PDF_BYTES) {
    throw new MessageValidationError(`Document exceeds maximum size of 10 MB (got ${buffer.length} bytes).`, 'INVALID_DOCUMENT');
  }

  // Validate declared fileSize if provided
  if (fileSize !== undefined && typeof fileSize === 'number' && Math.abs(fileSize - buffer.length) > 64) {
    throw new MessageValidationError('Declared document fileSize does not match decoded content.', 'INVALID_DOCUMENT');
  }

  // Magic bytes check: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
  if (buffer.length < 5 || buffer.toString('utf-8', 0, 5) !== '%PDF-') {
    throw new MessageValidationError('Invalid PDF document: missing %PDF- header magic bytes.', 'INVALID_DOCUMENT');
  }

  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

  return {
    fileName: fileName.trim(),
    fileSize: buffer.length,
    mimeType: 'application/pdf',
    sha256,
    base64Data: cleanBase64,
  };
}

export interface IMessageStore {
  list(userId: string, workspaceId: string): Promise<MessageDocument[]>;
  findByRequestId(userId: string, workspaceId: string, requestId: string): Promise<MessageDocument | null>;
  findModelMessageByRequestId(userId: string, workspaceId: string, requestId: string): Promise<MessageDocument | null>;
  create(userId: string, workspaceId: string, message: MessageWriteDocument): Promise<MessageDocument>;
  completeExchange(
    userId: string,
    workspaceId: string,
    userMessageId: string,
    modelMessage: MessageWriteDocument
  ): Promise<{ userMessage: MessageDocument; modelMessage: MessageDocument }>;
  failUserMessage(
    userId: string,
    workspaceId: string,
    userMessageId: string,
    safeErrorCode: string
  ): Promise<MessageDocument>;
}

export class FirestoreMessageStore implements IMessageStore {
  private firestoreProvider: () => Firestore;

  constructor(firestoreProvider: () => Firestore = getFirebaseFirestore) {
    this.firestoreProvider = firestoreProvider;
  }

  private getCollection(userId: string, workspaceId: string) {
    try {
      const db = this.firestoreProvider();
      return db.collection('users').doc(userId).collection('workspaces').doc(workspaceId).collection('messages');
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
      // Query up to 50 latest messages, returned in chronological order
      const snapshot = await this.getCollection(userId, workspaceId)
        .orderBy('createdAt', 'asc')
        .limit(50)
        .get();

      const messages: MessageDocument[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as MessageDocument;
        if (data) {
          messages.push(data);
        }
      });
      return messages;
    } catch (err) {
      if (err instanceof MessageValidationError || err instanceof WorkspaceNotFoundError) {
        throw err;
      }
      throw new WorkspacePersistenceError();
    }
  }

  async findByRequestId(userId: string, workspaceId: string, requestId: string): Promise<MessageDocument | null> {
    try {
      const snapshot = await this.getCollection(userId, workspaceId)
        .where('requestId', '==', requestId)
        .limit(2)
        .get();

      if (snapshot.empty) {
        return null;
      }

      // Return the user message with this requestId
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
      const snapshot = await this.getCollection(userId, workspaceId)
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

  async create(userId: string, workspaceId: string, message: MessageWriteDocument): Promise<MessageDocument> {
    try {
      const docRef = this.getCollection(userId, workspaceId).doc(message.id);
      await docRef.set({
        ...message,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      const snap = await docRef.get();
      if (!snap.exists) {
        throw new WorkspacePersistenceError();
      }
      return snap.data() as MessageDocument;
    } catch (err) {
      if (err instanceof MessageValidationError) {
        throw err;
      }
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
      const coll = this.getCollection(userId, workspaceId);
      const userDocRef = coll.doc(userMessageId);
      const modelDocRef = coll.doc(modelMessage.id);
      const workspaceRef = this.getWorkspaceRef(userId, workspaceId);

      const batch = db.batch();

      // 1. Mark user message complete
      batch.update(userDocRef, {
        status: 'complete',
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 2. Save model message
      batch.set(modelDocRef, {
        ...modelMessage,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 3. Update workspace timestamp
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
      throw new WorkspacePersistenceError();
    }
  }

  async failUserMessage(
    userId: string,
    workspaceId: string,
    userMessageId: string,
    safeErrorCode: string
  ): Promise<MessageDocument> {
    try {
      const userDocRef = this.getCollection(userId, workspaceId).doc(userMessageId);
      await userDocRef.update({
        status: 'failed',
        safeErrorCode,
        updatedAt: FieldValue.serverTimestamp(),
      });

      const snap = await userDocRef.get();
      if (!snap.exists) {
        throw new WorkspacePersistenceError();
      }
      return snap.data() as MessageDocument;
    } catch (err) {
      if (err instanceof MessageValidationError) {
        throw err;
      }
      throw new WorkspacePersistenceError();
    }
  }
}

export class InMemoryMessageStore implements IMessageStore {
  // Key: `${userId}:${workspaceId}` -> Array of MessageDocument
  private store = new Map<string, Map<string, MessageDocument>>();

  private getKey(userId: string, workspaceId: string): string {
    return `${userId}:${workspaceId}`;
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
    return Array.from(map.values())
      .sort((a, b) => {
        const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt as any).getTime();
        const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt as any).getTime();
        return timeA - timeB;
      })
      .slice(0, 50);
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

  async create(userId: string, workspaceId: string, message: MessageWriteDocument): Promise<MessageDocument> {
    const map = this.getMessagesMap(userId, workspaceId);
    const now = Timestamp.now();
    const doc: MessageDocument = {
      id: message.id,
      requestId: message.requestId,
      role: message.role,
      text: message.text,
      status: message.status,
      modelUsed: message.modelUsed,
      safeErrorCode: message.safeErrorCode,
      attachment: message.attachment ? { ...message.attachment } : null,
      createdAt: message.createdAt instanceof Timestamp ? message.createdAt : now,
      updatedAt: message.updatedAt instanceof Timestamp ? message.updatedAt : now,
    };
    map.set(doc.id, doc);
    return { ...doc };
  }

  async completeExchange(
    userId: string,
    workspaceId: string,
    userMessageId: string,
    modelMessage: MessageWriteDocument
  ): Promise<{ userMessage: MessageDocument; modelMessage: MessageDocument }> {
    const map = this.getMessagesMap(userId, workspaceId);
    const userDoc = map.get(userMessageId);
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

    map.set(resolvedModel.id, resolvedModel);

    return {
      userMessage: { ...userDoc },
      modelMessage: { ...resolvedModel },
    };
  }

  async failUserMessage(
    userId: string,
    workspaceId: string,
    userMessageId: string,
    safeErrorCode: string
  ): Promise<MessageDocument> {
    const map = this.getMessagesMap(userId, workspaceId);
    const userDoc = map.get(userMessageId);
    if (!userDoc) {
      throw new WorkspacePersistenceError();
    }
    userDoc.status = 'failed';
    userDoc.safeErrorCode = safeErrorCode;
    userDoc.updatedAt = Timestamp.now();
    return { ...userDoc };
  }

  clear(): void {
    this.store.clear();
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

  private validateRequestId(requestId: unknown): string {
    if (!requestId || typeof requestId !== 'string') {
      throw new MessageValidationError('Missing or invalid requestId.', 'INVALID_MESSAGE');
    }
    const trimmed = requestId.trim();
    if (trimmed.length < 8 || trimmed.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      throw new MessageValidationError('requestId must be between 8 and 128 alphanumeric, hyphen, or underscore characters.', 'INVALID_MESSAGE');
    }
    return trimmed;
  }

  private validateUserText(text: unknown): string {
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
   * Checks for an existing message by requestId for idempotency.
   */
  async findByRequestId(userId: string, workspaceId: string, rawRequestId: string): Promise<MessageDocument | null> {
    const requestId = this.validateRequestId(rawRequestId);
    return this.store.findByRequestId(userId, workspaceId, requestId);
  }

  async findModelMessageByRequestId(userId: string, workspaceId: string, rawRequestId: string): Promise<MessageDocument | null> {
    const requestId = this.validateRequestId(rawRequestId);
    return this.store.findModelMessageByRequestId(userId, workspaceId, requestId);
  }

  /**
   * Step 1: Saves initial pending user message.
   */
  async createPendingUserMessage(
    userId: string,
    workspaceId: string,
    params: { text: string; requestId: string; attachment?: AttachmentMetadata | null }
  ): Promise<MessageDocument> {
    const validText = this.validateUserText(params.text);
    const validRequestId = this.validateRequestId(params.requestId);

    const isMemory = this.store instanceof InMemoryMessageStore;
    const writeDoc: MessageWriteDocument = {
      id: crypto.randomUUID(),
      requestId: validRequestId,
      role: 'user',
      text: validText,
      status: 'pending',
      modelUsed: null,
      safeErrorCode: null,
      attachment: params.attachment || null,
      createdAt: isMemory ? Timestamp.now() : FieldValue.serverTimestamp(),
      updatedAt: isMemory ? Timestamp.now() : FieldValue.serverTimestamp(),
    };

    return this.store.create(userId, workspaceId, writeDoc);
  }

  /**
   * Step 2: Atomically complete the exchange with model message.
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
   * Step 3: Mark user message failed without clearing prompt text.
   */
  async failUserMessage(
    userId: string,
    workspaceId: string,
    userMessageId: string,
    safeErrorCode: string
  ): Promise<MessageDto> {
    const doc = await this.store.failUserMessage(userId, workspaceId, userMessageId, safeErrorCode);
    return toMessageDto(doc);
  }
}

export const messageService = new MessageService();
