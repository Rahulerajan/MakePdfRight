import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible, message = 'Processing...' }) => {
  useEffect(() => {
    if (isVisible) {
      document.body.classList.add('loading-active');
    } else {
      document.body.classList.remove('loading-active');
    }
    return () => {
      document.body.classList.remove('loading-active');
    };
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md"
        >
          <div className="flex flex-col items-center gap-8">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
              <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{message}</p>
              <p className="text-slate-500 dark:text-slate-400 font-medium">This won't take long</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
