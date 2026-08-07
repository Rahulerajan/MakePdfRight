import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Check, AlertTriangle, X } from 'lucide-react';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  progress?: number; // Optional manual progress
  error?: string | null; // Optional error message
  onCloseError?: () => void; // Callback to close error state
  onCancel?: () => void; // Callback to cancel processing
  cancelable?: boolean; // Explicit cancellation control
  cancelLabel?: string; // Optional custom label for cancel button
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = 'Processing...',
  progress: manualProgress,
  error = null,
  onCloseError,
  onCancel,
  cancelable,
  cancelLabel = 'Cancel',
}) => {
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const [statusText, setStatusText] = useState('Preparing files...');
  const [showSuccess, setShowSuccess] = useState(false);
  const [internalVisible, setInternalVisible] = useState(false);

  // Handle body scroll locking
  useEffect(() => {
    if (isVisible || error) {
      document.body.classList.add('loading-active');
    } else {
      document.body.classList.remove('loading-active');
    }
    return () => {
      document.body.classList.remove('loading-active');
    };
  }, [isVisible, error]);

  // Coordinate visibility and success states
  useEffect(() => {
    if (isVisible) {
      setInternalVisible(true);
      setShowSuccess(false);
      setSimulatedProgress(0);
    } else if (internalVisible && !error) {
      // Transition to success state before closing
      setShowSuccess(true);
      setSimulatedProgress(100);
      const timer = setTimeout(() => {
        setInternalVisible(false);
        setShowSuccess(false);
      }, 1500); // Hold success state for 1.5 seconds
      return () => clearTimeout(timer);
    } else {
      setInternalVisible(false);
      setShowSuccess(false);
    }
  }, [isVisible, error]);

  // Simulate progress when visible and not manual
  useEffect(() => {
    if (!isVisible || manualProgress !== undefined || showSuccess) return;

    const interval = setInterval(() => {
      setSimulatedProgress((prev) => {
        if (prev >= 98) return 98;
        // Fast start, slows down near completion
        const remaining = 98 - prev;
        const increment = Math.max(1, Math.min(6, Math.floor(remaining * 0.15)));
        return prev + increment;
      });
    }, 250);

    return () => clearInterval(interval);
  }, [isVisible, manualProgress, showSuccess]);

  // Update status messages based on current progress
  const currentProgress = manualProgress !== undefined ? manualProgress : simulatedProgress;

  useEffect(() => {
    if (showSuccess || currentProgress >= 100) {
      setStatusText('Success! Your document is ready.');
    } else if (currentProgress < 25) {
      setStatusText('Preparing files...');
    } else if (currentProgress < 55) {
      setStatusText('Processing document...');
    } else if (currentProgress < 80) {
      setStatusText('Optimizing document structure...');
    } else {
      setStatusText('Almost done...');
    }
  }, [currentProgress, showSuccess]);

  const checkmarkPathVariants: Variants = {
    hidden: { pathLength: 0 },
    visible: {
      pathLength: 1,
      transition: { duration: 0.4, ease: 'easeOut', delay: 0.1 },
    },
  };

  return (
    <AnimatePresence>
      {(internalVisible || error) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-md"
        >
          {error ? (
            // Error Card
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-md bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl rounded-3xl border border-red-200/60 dark:border-red-900/50 p-8 shadow-[0_32px_64px_-16px_rgba(239,68,68,0.12)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] text-center space-y-6"
            >
              {onCloseError && (
                <button
                  onClick={onCloseError}
                  className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 dark:text-red-400 mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Processing Failed</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  {error || 'An unexpected error occurred while processing your document. Please try again.'}
                </p>
              </div>
              {onCloseError && (
                <button
                  onClick={onCloseError}
                  className="w-full btn-primary bg-red-600 hover:bg-red-700 active:bg-red-800 text-white py-3 rounded-xl font-bold text-sm shadow-md transition-all duration-200"
                >
                  Close & Retry
                </button>
              )}
            </motion.div>
          ) : (
            // Loading Card (Polished dark modal overlay with red ring spinner & progress bar)
            <motion.div
              initial={{ scale: 0.95, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="w-full max-w-sm bg-[#0f141c] text-white rounded-3xl border border-slate-800/90 p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] text-center space-y-6"
            >
              {/* Animation Graphic Area */}
              <div className="flex justify-center relative py-2">
                <AnimatePresence mode="wait">
                  {showSuccess ? (
                    <motion.div
                      key="success"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10"
                    >
                      <svg
                        className="w-7 h-7 stroke-current"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={3}
                      >
                        <motion.path
                          variants={checkmarkPathVariants}
                          initial="hidden"
                          animate="visible"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </motion.div>
                  ) : (
                    <motion.div key="spinner" className="relative w-14 h-14 flex items-center justify-center">
                      {/* Red ring spinner matching reference screenshot */}
                      <svg className="w-full h-full animate-spin text-[#E5322D]" viewBox="0 0 50 50">
                        <circle
                          className="opacity-20"
                          cx="25"
                          cy="25"
                          r="20"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-90"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                          d="M25,5a20,20 0 0,1 20,20"
                        />
                      </svg>
                      {/* Subtle center core dot */}
                      <div className="absolute w-3 h-3 bg-[#E5322D] rounded-full shadow-[0_0_8px_rgba(229,50,45,0.8)]" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Status and Description */}
              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-white tracking-tight leading-snug">
                  {showSuccess ? 'Success!' : message}
                </h3>
                <p className="text-xs font-extrabold text-[#E5322D] uppercase tracking-widest min-h-[18px]">
                  {statusText}
                </p>
              </div>

              {/* Progress Indicator */}
              <div className="space-y-2.5 pt-1">
                <div className="flex justify-between items-center text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  <span>PROGRESS</span>
                  <span className="font-mono text-xs font-bold text-slate-200">
                    {Math.round(currentProgress)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800/90 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#E5322D] rounded-full relative"
                    initial={{ width: 0 }}
                    animate={{ width: `${currentProgress}%` }}
                    transition={{ type: 'spring', stiffness: 80, damping: 15 }}
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-[shimmer_1.5s_infinite]" />
                  </motion.div>
                </div>
              </div>

              {(cancelable !== false && onCancel && !showSuccess) && (
                <div className="pt-1">
                  <button
                    onClick={onCancel}
                    className="px-6 py-2.5 text-xs font-bold text-slate-300 hover:text-white transition-colors border border-slate-800/90 rounded-xl bg-slate-900/60 hover:bg-slate-800 cursor-pointer shadow-sm"
                  >
                    {cancelLabel}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
