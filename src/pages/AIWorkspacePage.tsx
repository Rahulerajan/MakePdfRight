/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../components/LanguageContext';
import { authenticatedFetch } from '../lib/authenticatedFetch';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Shield,
  RefreshCw,
  LogOut,
  FolderPlus,
  Folder,
  Edit3,
  Trash2,
  Save,
  Check,
  X,
  Clock,
  Sliders,
  AlertTriangle,
} from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  customInstructions: string;
  createdAt: string;
  updatedAt: string;
}

export const AIWorkspacePage: React.FC = () => {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();

  const mapWorkspaceErrorCode = useCallback(
    (code?: string, fallbackKey: string = 'workspace.error_unknown'): string => {
      switch (code) {
        case 'INVALID_REQUEST':
        case 'INVALID_NAME':
        case 'INVALID_INSTRUCTIONS':
          return t('workspace.error_invalid_data');
        case 'WORKSPACE_NOT_FOUND':
          return t('workspace.error_not_found');
        case 'PERSISTENCE_UNAVAILABLE':
          return t('workspace.error_persistence_unavailable');
        case 'UNAUTHORIZED':
          return t('workspace.error_unauthorized');
        default:
          return t(fallbackKey);
      }
    },
    [t]
  );

  // Authentication check status
  const [serverCheckStatus, setServerCheckStatus] = useState<'idle' | 'checking' | 'verified' | 'failed'>('idle');

  // Workspaces state
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState<boolean>(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState<string>('');
  const [newCustomInstructions, setNewCustomInstructions] = useState<string>('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);

  // Rename inline state
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');
  const [isSubmittingRename, setIsSubmittingRename] = useState<boolean>(false);

  // Delete modal state
  const [deletingWorkspaceId, setDeletingWorkspaceId] = useState<string | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState<boolean>(false);

  // Custom instructions editor state
  const [instructionsDraft, setInstructionsDraft] = useState<string>('');
  const [isSavingInstructions, setIsSavingInstructions] = useState<boolean>(false);
  const [instructionsSavedStatus, setInstructionsSavedStatus] = useState<boolean>(false);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || null;

  // Fetch workspaces from API
  const fetchWorkspaces = useCallback(async () => {
    setIsLoadingWorkspaces(true);
    setWorkspaceError(null);

    try {
      const res = await authenticatedFetch('/api/ai-workspace/workspaces');
      const data = await res.json();

      if (res.ok && data.success && Array.isArray(data.workspaces)) {
        setWorkspaces(data.workspaces);
        // If no active workspace or previous active was deleted, select first available
        if (data.workspaces.length > 0) {
          setActiveWorkspaceId((prev) => {
            const exists = data.workspaces.some((w: Workspace) => w.id === prev);
            return exists ? prev : data.workspaces[0].id;
          });
        } else {
          setActiveWorkspaceId(null);
        }
      } else {
        setWorkspaceError(mapWorkspaceErrorCode(data?.code, 'workspace.error_load'));
      }
    } catch {
      setWorkspaceError(mapWorkspaceErrorCode(undefined, 'workspace.error_load'));
    } finally {
      setIsLoadingWorkspaces(false);
    }
  }, [mapWorkspaceErrorCode]);

  // Load on component mount
  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  // Synchronize instructions draft whenever active workspace changes
  useEffect(() => {
    if (activeWorkspace) {
      setInstructionsDraft(activeWorkspace.customInstructions || '');
      setInstructionsSavedStatus(false);
    } else {
      setInstructionsDraft('');
    }
  }, [activeWorkspaceId, activeWorkspace]);

  // Verify backend token
  const verifyBackendToken = async () => {
    setServerCheckStatus('checking');

    try {
      const response = await authenticatedFetch('/api/ai-workspace/auth-check');
      const data = await response.json();

      if (response.ok && data.success) {
        setServerCheckStatus('verified');
      } else {
        setServerCheckStatus('failed');
      }
    } catch {
      setServerCheckStatus('failed');
    }
  };

  // Create Workspace
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newWorkspaceName.trim();
    if (!cleanName) return;

    setIsSubmittingCreate(true);
    setWorkspaceError(null);

    try {
      const res = await authenticatedFetch('/api/ai-workspace/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          customInstructions: newCustomInstructions.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.workspace) {
        const created: Workspace = data.workspace;
        setWorkspaces((prev) => [created, ...prev]);
        setActiveWorkspaceId(created.id);
        setIsCreateModalOpen(false);
        setNewWorkspaceName('');
        setNewCustomInstructions('');
        setFeedbackMessage({ type: 'success', text: t('workspace.saved') });
        setTimeout(() => setFeedbackMessage(null), 3000);
      } else {
        setWorkspaceError(mapWorkspaceErrorCode(data?.code, 'workspace.error_create'));
      }
    } catch {
      setWorkspaceError(mapWorkspaceErrorCode(undefined, 'workspace.error_create'));
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Start Rename
  const handleStartRename = (workspace: Workspace) => {
    setEditingWorkspaceId(workspace.id);
    setRenameValue(workspace.name);
  };

  // Submit Rename
  const handleSaveRename = async (workspaceId: string) => {
    const cleanName = renameValue.trim();
    if (!cleanName) return;

    setIsSubmittingRename(true);
    setWorkspaceError(null);

    try {
      const res = await authenticatedFetch(`/api/ai-workspace/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.workspace) {
        const updated: Workspace = data.workspace;
        setWorkspaces((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
        setEditingWorkspaceId(null);
        setFeedbackMessage({ type: 'success', text: t('workspace.saved') });
        setTimeout(() => setFeedbackMessage(null), 3000);
      } else {
        setWorkspaceError(mapWorkspaceErrorCode(data?.code, 'workspace.error_update'));
      }
    } catch {
      setWorkspaceError(mapWorkspaceErrorCode(undefined, 'workspace.error_update'));
    } finally {
      setIsSubmittingRename(false);
    }
  };

  // Save Custom Instructions
  const handleSaveInstructions = async () => {
    if (!activeWorkspace) return;

    setIsSavingInstructions(true);
    setWorkspaceError(null);

    try {
      const res = await authenticatedFetch(`/api/ai-workspace/workspaces/${activeWorkspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customInstructions: instructionsDraft }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.workspace) {
        const updated: Workspace = data.workspace;
        setWorkspaces((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
        setInstructionsSavedStatus(true);
        setTimeout(() => setInstructionsSavedStatus(false), 3000);
      } else {
        setWorkspaceError(mapWorkspaceErrorCode(data?.code, 'workspace.error_update'));
      }
    } catch {
      setWorkspaceError(mapWorkspaceErrorCode(undefined, 'workspace.error_update'));
    } finally {
      setIsSavingInstructions(false);
    }
  };

  // Confirm Delete Workspace
  const handleConfirmDelete = async () => {
    if (!deletingWorkspaceId) return;

    setIsSubmittingDelete(true);
    setWorkspaceError(null);

    try {
      const res = await authenticatedFetch(`/api/ai-workspace/workspaces/${deletingWorkspaceId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setWorkspaces((prev) => {
          const filtered = prev.filter((w) => w.id !== deletingWorkspaceId);
          if (activeWorkspaceId === deletingWorkspaceId) {
            setActiveWorkspaceId(filtered.length > 0 ? filtered[0].id : null);
          }
          return filtered;
        });
        setDeletingWorkspaceId(null);
        setFeedbackMessage({ type: 'success', text: t('workspace.saved') });
        setTimeout(() => setFeedbackMessage(null), 3000);
      } else {
        setWorkspaceError(mapWorkspaceErrorCode(data?.code, 'workspace.error_delete'));
      }
    } catch {
      setWorkspaceError(mapWorkspaceErrorCode(undefined, 'workspace.error_delete'));
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const getInitials = () => {
    if (user?.displayName) {
      return user.displayName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    }
    return user?.email ? user.email[0].toUpperCase() : 'U';
  };

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div id="ai-workspace-container" className="container-custom py-8 sm:py-12 max-w-5xl mx-auto space-y-8">
      {/* Header Banner */}
      <header
        id="ai-workspace-header"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {t('auth.signed_in_securely')}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {t('auth.workspace_title')}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('auth.workspace_subtitle')}
            </p>
          </div>
        </div>

        <button
          id="btn-sign-out"
          onClick={signOut}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          {t('auth.sign_out')}
        </button>
      </header>

      {/* Global Alerts */}
      {feedbackMessage && (
        <div
          id="workspace-feedback-banner"
          className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-sm font-medium transition-all"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {workspaceError && (
        <div
          id="workspace-error-banner"
          className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-center justify-between gap-3 text-red-800 dark:text-red-300 text-sm font-medium transition-all"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <span>{workspaceError}</span>
          </div>
          <button
            onClick={() => setWorkspaceError(null)}
            className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Workspace Manager Section */}
      <section
        id="workspaces-manager-section"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Folder className="w-5 h-5 text-primary" />
              {t('workspace.title')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {t('workspace.subtitle')}
            </p>
          </div>

          <button
            id="btn-open-create-workspace"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-semibold text-xs sm:text-sm hover:bg-primary/90 transition-colors cursor-pointer shadow-sm shrink-0"
          >
            <FolderPlus className="w-4 h-4" />
            {t('workspace.create_new')}
          </button>
        </div>

        {/* Loading State */}
        {isLoadingWorkspaces ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs">{t('auth.verifying_status')}</p>
          </div>
        ) : workspaces.length === 0 ? (
          /* Empty State */
          <div
            id="workspaces-empty-state"
            className="py-12 px-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Folder className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {t('workspace.empty_title')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {t('workspace.empty_desc')}
              </p>
            </div>
            <button
              id="btn-create-first-workspace"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              {t('workspace.empty_action')}
            </button>
          </div>
        ) : (
          /* Workspaces Grid & Active Inspector */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Workspaces List (Left Column) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
                {t('workspace.total_workspaces')} ({workspaces.length})
              </div>

              <div id="workspaces-list" className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {workspaces.map((ws) => {
                  const isSelected = ws.id === activeWorkspaceId;
                  const isEditing = editingWorkspaceId === ws.id;

                  return (
                    <div
                      key={ws.id}
                      id={`workspace-card-${ws.id}`}
                      onClick={() => !isEditing && setActiveWorkspaceId(ws.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                        isSelected
                          ? 'bg-primary/5 border-primary/40 dark:bg-primary/10 dark:border-primary/50'
                          : 'bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              id={`input-rename-${ws.id}`}
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              maxLength={100}
                              autoFocus
                              className="flex-1 px-2.5 py-1 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-primary rounded-lg focus:outline-none text-slate-900 dark:text-white"
                            />
                            <button
                              id={`btn-save-rename-${ws.id}`}
                              onClick={() => handleSaveRename(ws.id)}
                              disabled={isSubmittingRename || !renameValue.trim()}
                              className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                              title={t('workspace.save')}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`btn-cancel-rename-${ws.id}`}
                              onClick={() => setEditingWorkspaceId(null)}
                              className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                              title={t('workspace.cancel')}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  isSelected ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
                                }`}
                              />
                              <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                {ws.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                id={`btn-rename-${ws.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartRename(ws);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                                title={t('workspace.rename')}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                id={`btn-delete-${ws.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingWorkspaceId(ws.id);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                title={t('workspace.delete')}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(ws.updatedAt)}
                        </span>
                        {isSelected && (
                          <span className="font-semibold text-primary">{t('workspace.active')}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Instructions Editor (Right Column) */}
            <div className="lg:col-span-7 space-y-4">
              {activeWorkspace ? (
                <div
                  id="active-workspace-editor"
                  className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-primary">
                        {t('workspace.active')}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {activeWorkspace.name}
                      </h3>
                    </div>

                    <div className="text-[11px] text-slate-400 dark:text-slate-500">
                      {t('workspace.created_at')}: {formatDate(activeWorkspace.createdAt)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="workspace-instructions-input"
                        className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                      >
                        <Sliders className="w-3.5 h-3.5 text-primary" />
                        {t('workspace.instructions_label')}
                      </label>
                      <span className="text-[11px] text-slate-400">
                        {instructionsDraft.length} / 4000 {t('workspace.chars_count')}
                      </span>
                    </div>

                    <textarea
                      id="workspace-instructions-input"
                      value={instructionsDraft}
                      onChange={(e) => setInstructionsDraft(e.target.value.slice(0, 4000))}
                      placeholder={t('workspace.instructions_placeholder')}
                      rows={7}
                      maxLength={4000}
                      className="w-full p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y leading-relaxed"
                    />

                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      {t('workspace.instructions_help')}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div>
                      {instructionsSavedStatus && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          {t('workspace.saved')}
                        </span>
                      )}
                    </div>

                    <button
                      id="btn-save-instructions"
                      onClick={handleSaveInstructions}
                      disabled={isSavingInstructions}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {isSavingInstructions ? t('workspace.saving') : t('workspace.save_instructions')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-400 text-xs">
                  {t('workspace.select')}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Authenticated Identity Card */}
      <section
        id="session-info-card"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6"
      >
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          {t('auth.session_info')}
        </h2>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || t('auth.user_avatar')}
                className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-base">
                {getInitials()}
              </div>
            )}
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {user?.displayName || t('auth.account')}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user?.email || t('auth.no_email')}
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{t('auth.signed_in_securely')}</span>
          </div>
        </div>

        {/* Backend Verification Box */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('auth.connection_status')}
            </div>
          </div>

          <button
            id="btn-verify-connection"
            onClick={verifyBackendToken}
            disabled={serverCheckStatus === 'checking'}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${serverCheckStatus === 'checking' ? 'animate-spin' : ''}`} />
            {serverCheckStatus === 'checking' ? t('auth.verifying') : t('auth.verify_connection')}
          </button>
        </div>

        {serverCheckStatus === 'verified' && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-sm font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{t('auth.connection_verified')}</span>
          </div>
        )}

        {serverCheckStatus === 'failed' && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-center gap-3 text-red-800 dark:text-red-300 text-sm font-medium">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <span>{t('auth.connection_failed')}</span>
          </div>
        )}
      </section>

      {/* Create Workspace Modal */}
      {isCreateModalOpen && (
        <div
          id="modal-create-workspace"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-primary" />
                {t('workspace.create_title')}
              </h3>
              <button
                id="btn-close-create-modal"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="new-workspace-name-input"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  {t('workspace.name_label')} *
                </label>
                <input
                  id="new-workspace-name-input"
                  type="text"
                  required
                  maxLength={100}
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder={t('workspace.name_placeholder')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="new-workspace-instructions-input"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    {t('workspace.instructions_label')}
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {newCustomInstructions.length} / 4000
                  </span>
                </div>
                <textarea
                  id="new-workspace-instructions-input"
                  rows={4}
                  maxLength={4000}
                  value={newCustomInstructions}
                  onChange={(e) => setNewCustomInstructions(e.target.value.slice(0, 4000))}
                  placeholder={t('workspace.instructions_placeholder')}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
                />
                <p className="text-[11px] text-slate-400">{t('workspace.instructions_help')}</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  id="btn-cancel-create"
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {t('workspace.cancel')}
                </button>
                <button
                  id="btn-submit-create"
                  type="submit"
                  disabled={isSubmittingCreate || !newWorkspaceName.trim()}
                  className="px-5 py-2 rounded-xl bg-primary text-white font-semibold text-xs sm:text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSubmittingCreate ? t('workspace.saving') : t('workspace.create_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Workspace Confirmation Modal */}
      {deletingWorkspaceId && (
        <div
          id="modal-delete-workspace"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t('workspace.delete_confirm_title')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {t('workspace.delete_confirm_desc')}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                id="btn-cancel-delete"
                type="button"
                onClick={() => setDeletingWorkspaceId(null)}
                disabled={isSubmittingDelete}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {t('workspace.cancel')}
              </button>
              <button
                id="btn-confirm-delete"
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmittingDelete}
                className="px-5 py-2 rounded-xl bg-red-600 text-white font-semibold text-xs sm:text-sm hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isSubmittingDelete ? t('workspace.saving') : t('workspace.confirm_delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
