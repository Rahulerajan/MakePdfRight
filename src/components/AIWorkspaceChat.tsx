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
  ShieldAlert,
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

  // Selected PDF attachment
  const [attachedPdf, setAttachedPdf] = useState<{
    file: File;
    base64Data: string;
    fileSize: number;
  } | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Map server error code to localized message
  const mapErrorCode = (code?: string, fallback: string = 'workspace.error_unknown'): string => {
    switch (code) {
      case 'AI_RATE_LIMITED':
        return t('workspace.error_rate_limited');
      case 'AI_UNAVAILABLE':
        return t('workspace.error_ai_unavailable');
      case 'AI_CONFIGURATION_UNAVAILABLE':
        return t('workspace.error_ai_config');
      case 'INVALID_DOCUMENT':
      case 'INVALID_MESSAGE':
        return t('workspace.error_invalid_pdf');
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

  // Handle PDF file selection
  const handlePdfFileSelect = (file: File) => {
    setAttachmentError(null);

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setAttachmentError('Only PDF documents are supported.');
      return;
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      setAttachmentError('PDF exceeds the 10 MB maximum upload limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(buffer);

      // Verify %PDF- magic bytes (0x25, 0x50, 0x44, 0x46, 0x2D)
      if (
        bytes.length < 5 ||
        bytes[0] !== 0x25 ||
        bytes[1] !== 0x50 ||
        bytes[2] !== 0x44 ||
        bytes[3] !== 0x46 ||
        bytes[4] !== 0x2d
      ) {
        setAttachmentError('The selected file is not a valid PDF document.');
        return;
      }

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
      });
    };

    reader.onerror = () => {
      setAttachmentError('Failed to read the selected file.');
    };

    reader.readAsArrayBuffer(file);
  };

  const handleSendMessage = async (retryText?: string) => {
    const textToSend = (retryText !== undefined ? retryText : inputText).trim();
    if (!textToSend && !attachedPdf) return;

    setIsSending(true);
    setChatError(null);

    const clientRequestId = crypto.randomUUID();

    // Optimistic pending user message for smooth UI
    const pendingMsg: MessageDto = {
      id: `temp-${Date.now()}`,
      requestId: clientRequestId,
      role: 'user',
      text: textToSend,
      status: 'pending',
      modelUsed: null,
      safeErrorCode: null,
      attachment: attachedPdf
        ? {
            fileName: attachedPdf.file.name,
            fileSize: attachedPdf.fileSize,
            mimeType: 'application/pdf',
            sha256: '',
          }
        : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, pendingMsg]);
    if (retryText === undefined) {
      setInputText('');
    }

    const payload: Record<string, any> = {
      text: textToSend,
      requestId: clientRequestId,
    };

    if (attachedPdf) {
      payload.document = {
        fileName: attachedPdf.file.name,
        fileSize: attachedPdf.fileSize,
        mimeType: 'application/pdf',
        data: attachedPdf.base64Data,
      };
    }

    try {
      const res = await authenticatedFetch(`/api/ai-workspace/workspaces/${workspaceId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success && data.userMessage) {
        // Clear attachment on success
        setAttachedPdf(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        // Replace pending user message with confirmed user message and model reply
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== pendingMsg.id);
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
        const errMessage = mapErrorCode(data?.code, 'workspace.error_unknown');
        setChatError(errMessage);

        // Update optimistic user message to failed
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingMsg.id
              ? { ...m, status: 'failed', safeErrorCode: data?.code || 'AI_UNAVAILABLE' }
              : m
          )
        );
      }
    } catch {
      setChatError(t('workspace.error_ai_unavailable'));
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingMsg.id
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

  return (
    <div id="ai-workspace-chat-container" className="flex flex-col h-[640px] bg-slate-50/60 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
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
              <span>Multi-turn Gemini AI</span>
            </div>
          </div>
        </div>

        <button
          onClick={fetchMessages}
          title="Refresh messages"
          disabled={isLoadingMessages}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
            className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 rounded"
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
            <p className="text-xs">Loading conversation history...</p>
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
                          onClick={() => handleSendMessage(msg.text)}
                          className="inline-flex items-center gap-1 font-semibold text-red-700 dark:text-red-300 hover:underline cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          {t('workspace.retry_message')}
                        </button>
                      )}

                      {!isUser && !isPending && (
                        <button
                          onClick={() => copyToClipboard(msg.text, msg.id)}
                          title="Copy reply"
                          className="p-1 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
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
              className="p-0.5 hover:bg-primary/20 rounded-full transition-colors"
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
