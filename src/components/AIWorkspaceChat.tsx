/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from './LanguageContext';
import { authenticatedFetch } from '../lib/authenticatedFetch';
import {
  Sparkles,
  Send,
  Paperclip,
  X,
  FileText,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  RotateCcw,
  Bot,
  User,
  UploadCloud,
} from 'lucide-react';

export interface AttachmentMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  sha256: string;
}

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

interface AIWorkspaceChatProps {
  workspaceId: string;
  workspaceName: string;
  customInstructions?: string;
  onWorkspaceUpdated?: () => void;
}

interface EphemeralAttachment {
  fileName: string;
  fileSize: number;
  mimeType: 'application/pdf';
  sha256: string;
  data: string;
}

export const AIWorkspaceChat: React.FC<AIWorkspaceChatProps> = ({
  workspaceId,
  workspaceName,
  onWorkspaceUpdated,
}) => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [chatError, setChatError] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  // Selected PDF attachment in composer
  const [attachedPdf, setAttachedPdf] = useState<{
    file: File;
    base64Data: string;
    fileSize: number;
    sha256: string;
  } | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  // Ephemeral in-memory store of attachment bytes keyed by requestId to allow retry without reupload
  const ephemeralAttachments = useRef<Map<string, EphemeralAttachment>>(new Map());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Map server error code to localized message
  const mapErrorCode = (code?: string, fallback: string = 'workspace.error_unknown'): string => {
    switch (code) {
      case 'REQUEST_IN_PROGRESS':
        return t('workspace.error_in_progress');
      case 'INVALID_DOCUMENT':
        return t('workspace.error_invalid_pdf');
      case 'INVALID_MESSAGE':
        return t('workspace.error_invalid_message');
      case 'AI_RATE_LIMITED':
        return t('workspace.error_rate_limited');
      case 'AI_UNAVAILABLE':
        return t('workspace.error_ai_unavailable');
      case 'AI_CONFIGURATION_UNAVAILABLE':
        return t('workspace.error_ai_config');
      case 'WORKSPACE_NOT_FOUND':
        return t('workspace.error_not_found');
      case 'UNAUTHORIZED':
        return t('workspace.error_unauthorized');
      case 'PERSISTENCE_UNAVAILABLE':
        return t('workspace.error_persistence_unavailable');
      default:
        return t(fallback);
    }
  };

  // Load message history for active workspace
  const fetchMessages = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoadingMessages(true);
    setChatError(null);

    try {
      const res = await authenticatedFetch(`/api/ai-workspace/workspaces/${workspaceId}/messages`);
      const data = await res.json();

      if (res.ok && data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
      } else {
        setChatError(mapErrorCode(data?.code, 'workspace.error_load'));
      }
    } catch {
      setChatError(t('workspace.error_load'));
    } finally {
      setIsLoadingMessages(false);
    }
  }, [workspaceId, t]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!isLoadingMessages) {
      scrollToBottom();
    }
  }, [messages, isLoadingMessages, scrollToBottom]);

  // Handle PDF file selection and integrity calculation
  const handlePdfFileSelect = async (file: File) => {
    setAttachmentError(null);

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setAttachmentError(t('workspace.error_invalid_pdf_type'));
      return;
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      setAttachmentError(t('workspace.error_invalid_pdf_size'));
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Verify %PDF- magic bytes (0x25, 0x50, 0x44, 0x46, 0x2D)
      if (
        bytes.length < 5 ||
        bytes[0] !== 0x25 ||
        bytes[1] !== 0x50 ||
        bytes[2] !== 0x44 ||
        bytes[3] !== 0x46 ||
        bytes[4] !== 0x2d
      ) {
        setAttachmentError(t('workspace.error_invalid_pdf_header'));
        return;
      }

      // Compute SHA-256 hex checksum
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const sha256Hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      // Convert buffer to base64
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.byteLength; i += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
      }
      const base64 = btoa(binary);

      setAttachedPdf({
        file,
        base64Data: base64,
        fileSize: file.size,
        sha256: sha256Hex,
      });
    } catch {
      setAttachmentError(t('workspace.error_read_file'));
    }
  };

  /**
   * Sends a user message or retries a failed message.
   * If retrying, reuses the exact same requestId and preserved attachment bytes.
   */
  const handleSendMessage = async (options?: {
    retryText?: string;
    existingRequestId?: string;
    existingAttachmentMeta?: AttachmentMetadata | null;
  }) => {
    const isRetry = Boolean(options?.existingRequestId);
    const textToSend = (options?.retryText !== undefined ? options.retryText : inputText).trim();

    if (!textToSend && !attachedPdf && !options?.existingAttachmentMeta) return;

    setIsSending(true);
    setChatError(null);

    const requestId = options?.existingRequestId || crypto.randomUUID();

    // Prepare document attachment payload
    let documentPayload: EphemeralAttachment | undefined = undefined;

    if (attachedPdf) {
      documentPayload = {
        fileName: attachedPdf.file.name,
        fileSize: attachedPdf.fileSize,
        mimeType: 'application/pdf',
        sha256: attachedPdf.sha256,
        data: attachedPdf.base64Data,
      };
      // Cache in ephemeral map for retries
      ephemeralAttachments.current.set(requestId, documentPayload);
    } else if (isRetry && options?.existingAttachmentMeta) {
      // Look up cached bytes from ephemeral browser memory
      const cached = ephemeralAttachments.current.get(requestId);
      if (cached) {
        documentPayload = cached;
      } else {
        // Ephemeral memory unavailable (e.g. after refresh)
        setChatError(t('workspace.error_reattach_pdf'));
        setIsSending(false);
        return;
      }
    }

    const payload: Record<string, any> = {
      text: textToSend,
      requestId,
    };

    if (documentPayload) {
      payload.document = documentPayload;
    }

    // Save prompt before clearing composer to ensure preservation on failure
    const originalInputText = inputText;
    if (!isRetry) {
      setInputText('');
    }

    // Optimistic pending user message for smooth UI
    const pendingMsg: MessageDto = {
      id: isRetry ? `retry-${Date.now()}` : `temp-${Date.now()}`,
      requestId,
      role: 'user',
      text: textToSend,
      status: 'pending',
      modelUsed: null,
      safeErrorCode: null,
      attachment: documentPayload
        ? {
            fileName: documentPayload.fileName,
            fileSize: documentPayload.fileSize,
            mimeType: documentPayload.mimeType,
            sha256: documentPayload.sha256,
          }
        : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isRetry) {
      // Replace existing failed message in list with pending status
      setMessages((prev) =>
        prev.map((m) => (m.requestId === requestId && m.role === 'user' ? pendingMsg : m))
      );
    } else {
      setMessages((prev) => [...prev, pendingMsg]);
    }

    try {
      const res = await authenticatedFetch(`/api/ai-workspace/workspaces/${workspaceId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success && data.userMessage) {
        // Success: clear composer attachment
        setAttachedPdf(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        setMessages((prev) => {
          const filtered = prev.filter((m) => m.requestId !== requestId);
          const next = [...filtered, data.userMessage];
          if (data.modelMessage) {
            next.push(data.modelMessage);
          }
          return next;
        });

        if (onWorkspaceUpdated) {
          onWorkspaceUpdated();
        }
      } else {
        // Generation failed: restore composer text if this was a fresh submission
        if (!isRetry) {
          setInputText(originalInputText);
        }

        const errMessage = mapErrorCode(data?.code, 'workspace.error_unknown');
        setChatError(errMessage);

        // Update message state to failed
        setMessages((prev) =>
          prev.map((m) =>
            m.requestId === requestId && m.role === 'user'
              ? { ...m, status: 'failed', safeErrorCode: data?.code || 'AI_UNAVAILABLE' }
              : m
          )
        );
      }
    } catch {
      if (!isRetry) {
        setInputText(originalInputText);
      }
      setChatError(t('workspace.error_ai_unavailable'));
      setMessages((prev) =>
        prev.map((m) =>
          m.requestId === requestId && m.role === 'user'
            ? { ...m, status: 'failed', safeErrorCode: 'AI_UNAVAILABLE' }
            : m
        )
      );
    } finally {
      setIsSending(false);
    }
  };

  const copyToClipboard = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(msgId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePdfFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      id="ai-workspace-chat-container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col h-[640px] bg-slate-50/60 dark:bg-slate-900/60 rounded-2xl border transition-colors overflow-hidden ${
        isDraggingOver
          ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
          : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      {/* Drag overlay indicator */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs border-2 border-dashed border-primary rounded-2xl p-6 pointer-events-none">
          <UploadCloud className="w-12 h-12 text-primary animate-bounce mb-2" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t('workspace.drop_pdf_here')}
          </p>
        </div>
      )}

      {/* Chat Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              {workspaceName}
            </h4>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t('workspace.multi_turn_badge')}</span>
            </div>
          </div>
        </div>

        <button
          onClick={fetchMessages}
          title={t('workspace.refresh_messages')}
          disabled={isLoadingMessages}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingMessages ? 'animate-spin text-primary' : ''}`} />
        </button>
      </div>

      {/* Global Error Banner */}
      {chatError && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-800/60 flex items-center justify-between text-xs text-red-800 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{chatError}</span>
          </div>
          <button
            onClick={() => setChatError(null)}
            className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {isLoadingMessages ? (
          <div className="h-full flex flex-col items-center justify-center space-y-2 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs">{t('workspace.loading_history')}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="max-w-xs space-y-1">
              <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {t('workspace.empty_chat_title')}
              </h5>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {t('workspace.empty_chat_desc')}
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isPending = msg.status === 'pending';
            const isFailed = msg.status === 'failed';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 space-y-2 text-xs sm:text-sm ${
                    isUser
                      ? isFailed
                        ? 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-slate-900 dark:text-slate-100'
                        : 'bg-primary text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 shadow-xs'
                  }`}
                >
                  {/* Attached PDF card if present */}
                  {msg.attachment && (
                    <div
                      className={`p-2 rounded-xl flex items-center gap-2 text-xs ${
                        isUser
                          ? isFailed
                            ? 'bg-red-100/60 dark:bg-red-900/40 text-red-900 dark:text-red-200'
                            : 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      <div className="truncate flex-1">
                        <div className="font-semibold truncate">{msg.attachment.fileName}</div>
                        <div className="text-[10px] opacity-80">
                          {formatFileSize(msg.attachment.fileSize)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Message content */}
                  <div className="whitespace-pre-wrap leading-relaxed break-words">
                    {msg.text}
                  </div>

                  {/* Message status footer */}
                  <div
                    className={`flex items-center justify-between gap-3 pt-1 border-t text-[10px] ${
                      isUser
                        ? isFailed
                          ? 'border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                          : 'border-white/20 text-white/80'
                        : 'border-slate-100 dark:border-slate-700/60 text-slate-400'
                    }`}
                  >
                    <div>
                      {isPending ? (
                        <span className="inline-flex items-center gap-1.5 font-medium animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          {t('workspace.msg_pending')}
                        </span>
                      ) : isFailed ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-red-600 dark:text-red-400">
                          <AlertCircle className="w-3 h-3" />
                          {t('workspace.msg_failed')}
                        </span>
                      ) : msg.modelUsed ? (
                        <span className="font-mono">{msg.modelUsed}</span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      {isFailed && (
                        <button
                          onClick={() =>
                            handleSendMessage({
                              retryText: msg.text,
                              existingRequestId: msg.requestId,
                              existingAttachmentMeta: msg.attachment,
                            })
                          }
                          className="inline-flex items-center gap-1 font-semibold text-red-700 dark:text-red-300 hover:underline cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          {t('workspace.retry_message')}
                        </button>
                      )}

                      {!isUser && !isPending && (
                        <button
                          onClick={() => copyToClipboard(msg.text, msg.id)}
                          title={t('workspace.copy_reply')}
                          className="p-1 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          {copiedMessageId === msg.id ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment & Input Area */}
      <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
        {/* Attachment preview chip */}
        {attachedPdf && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-xs">{attachedPdf.file.name}</span>
            <span className="text-[10px] opacity-75">({formatFileSize(attachedPdf.fileSize)})</span>
            <button
              onClick={() => {
                setAttachedPdf(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              title={t('workspace.remove_attachment')}
              className="p-0.5 hover:bg-primary/20 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {attachmentError && (
          <div className="text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{attachmentError}</span>
          </div>
        )}

        {/* Input & Action buttons */}
        <div className="flex items-end gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,application/pdf"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handlePdfFileSelect(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          <button
            type="button"
            id="btn-attach-pdf"
            onClick={() => fileInputRef.current?.click()}
            title={t('workspace.attach_pdf')}
            className={`p-2.5 rounded-xl border transition-colors shrink-0 cursor-pointer ${
              attachedPdf
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <div className="flex-1 relative">
            <textarea
              id="workspace-chat-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value.slice(0, 5000))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isSending && (inputText.trim() || attachedPdf)) {
                    handleSendMessage();
                  }
                }
              }}
              placeholder={t('workspace.chat_placeholder')}
              rows={2}
              maxLength={5000}
              disabled={isSending}
              className="w-full p-2.5 sm:p-3 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none leading-relaxed"
            />
            <div className="absolute right-2.5 bottom-2 text-[10px] text-slate-400 select-none">
              {inputText.length} / 5000
            </div>
          </div>

          <button
            type="button"
            id="btn-send-message"
            onClick={() => handleSendMessage()}
            disabled={isSending || (!inputText.trim() && !attachedPdf)}
            className="p-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-40 cursor-pointer shrink-0 shadow-sm"
          >
            {isSending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
