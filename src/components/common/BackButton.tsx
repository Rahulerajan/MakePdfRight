import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  to?: string;
  onClick?: () => void;
  label?: string;
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({ 
  to = '/', 
  onClick, 
  label = 'Back', 
  className = '' 
}) => {
  const content = (
    <>
      <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-transform group-hover:-translate-x-1 shrink-0" />
      {label ? (
        <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
          {label}
        </span>
      ) : null}
    </>
  );

  const baseClasses = `min-w-[48px] min-h-[48px] px-3 py-2.5 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700/90 border border-slate-200/80 dark:border-slate-700/80 active:scale-95 transition-all text-slate-600 dark:text-slate-300 cursor-pointer group shrink-0 ${className}`;

  if (onClick) {
    return (
      <button 
        type="button" 
        onClick={onClick} 
        className={baseClasses} 
        aria-label={label || 'Back'}
        title={label || 'Back'}
      >
        {content}
      </button>
    );
  }

  return (
    <Link 
      to={to} 
      className={baseClasses} 
      aria-label={label || 'Back'}
      title={label || 'Back'}
    >
      {content}
    </Link>
  );
};
