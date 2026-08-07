import React, { useEffect, useRef } from 'react';

export type AdFormat = 'top-banner' | 'in-content' | 'sidebar' | 'sticky-mobile' | 'responsive' | 'native';

interface AdUnitProps {
  format?: AdFormat;
  slot?: string;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export const AdUnit: React.FC<AdUnitProps> = ({
  format = 'responsive',
  slot,
  className = '',
  style,
  label = 'Advertisement'
}) => {
  const adRef = useRef<HTMLDivElement>(null);
  const publisherId = import.meta.env.VITE_ADSENSE_PUB_ID || '';
  const isDev = import.meta.env.DEV || !publisherId;

  // Environment fallback slot IDs
  const defaultSlotMap: Record<AdFormat, string | undefined> = {
    'top-banner': import.meta.env.VITE_ADSENSE_SLOT_TOP,
    'in-content': import.meta.env.VITE_ADSENSE_SLOT_INCONTENT,
    'sidebar': import.meta.env.VITE_ADSENSE_SLOT_SIDEBAR,
    'sticky-mobile': import.meta.env.VITE_ADSENSE_SLOT_STICKY,
    'responsive': import.meta.env.VITE_ADSENSE_SLOT_RECTANGLE,
    'native': import.meta.env.VITE_ADSENSE_SLOT_INCONTENT,
  };

  const activeSlot = slot || defaultSlotMap[format];

  useEffect(() => {
    if (isDev || !publisherId) return;

    try {
      if (typeof window !== 'undefined') {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (err) {
      console.warn('[AdSense] Unit pushing error:', err);
    }
  }, [isDev, publisherId, activeSlot]);

  // Reserved min height classes to eliminate Cumulative Layout Shift (CLS)
  const formatHeightClasses: Record<AdFormat, string> = {
    'top-banner': 'min-h-[90px] max-w-5xl mx-auto',
    'in-content': 'min-h-[250px] sm:min-h-[280px] w-full',
    'sidebar': 'min-h-[250px] lg:min-h-[600px] w-full',
    'sticky-mobile': 'min-h-[50px] w-full',
    'responsive': 'min-h-[100px] sm:min-h-[250px] w-full',
    'native': 'min-h-[120px] w-full',
  };

  if (isDev) {
    return (
      <div
        ref={adRef}
        aria-label={label}
        className={`my-4 relative flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300/80 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40 p-3 text-center transition-colors select-none ${formatHeightClasses[format]} ${className}`}
        style={style}
      >
        <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400/60 dark:bg-slate-600"></span>
          <span>{label}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 font-mono">
            {format}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={adRef}
      aria-label={label}
      className={`my-4 flex flex-col items-center justify-center overflow-hidden transition-all ${formatHeightClasses[format]} ${className}`}
      style={style}
    >
      <div className="w-full text-center text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
        {label}
      </div>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', textAlign: 'center', ...style }}
        data-ad-client={publisherId}
        data-ad-slot={activeSlot}
        data-ad-format={format === 'sticky-mobile' ? 'horizontal' : format === 'sidebar' ? 'vertical' : 'auto'}
        data-full-width-responsive="true"
      />
    </div>
  );
};

export const StickyMobileAd: React.FC = () => {
  const [isDismissed, setIsDismissed] = React.useState(false);

  if (isDismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 shadow-lg px-2 py-1 backdrop-blur-md transition-all">
      <div className="relative max-w-md mx-auto flex items-center justify-center">
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute -top-3 right-1 w-5 h-5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center text-[10px] font-bold z-10 shadow cursor-pointer"
          title="Close advertisement"
          aria-label="Close advertisement"
        >
          ✕
        </button>
        <AdUnit format="sticky-mobile" className="!my-0" />
      </div>
    </div>
  );
};
