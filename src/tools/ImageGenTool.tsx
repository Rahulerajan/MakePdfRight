import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  ImageIcon, 
  RefreshCw, 
  Maximize2, 
  FileText,
  Copy,
  Check,
  Wand2
} from 'lucide-react';
import { generateImage } from '../services/gemini';
import { LoadingOverlay } from '../components/common/LoadingOverlay';

interface AspectRatioOption {
  value: string;
  label: string;
  name: string;
  desktopLabel: string;
  w: number;
  h: number;
}

export const ImageGenTool: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  React.useEffect(() => {
    if (resultUrl) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [resultUrl]);

  const ratios: AspectRatioOption[] = [
    { value: '1:1', label: '1:1', name: 'Square', desktopLabel: '1:1 Square', w: 18, h: 18 },
    { value: '16:9', label: '16:9', name: 'Widescreen', desktopLabel: '16:9 Widescreen', w: 22, h: 13 },
    { value: '4:3', label: '4:3', name: 'Landscape', desktopLabel: '4:3 Landscape', w: 20, h: 15 },
    { value: '3:4', label: '3:4', name: 'Portrait', desktopLabel: '3:4 Portrait', w: 15, h: 20 },
    { value: '9:16', label: '9:16', name: 'Mobile', desktopLabel: '9:16 Story', w: 12, h: 21 }
  ];

  const validatePrompt = (text: string): boolean => {
    if (!text || !text.trim()) {
      setErrorMsg("Please enter a prompt describing the image you'd like to generate.");
      return false;
    }
    if (text.trim().length < 5) {
      setErrorMsg("Your prompt is too short. Please describe the image with at least 5 characters.");
      return false;
    }
    return true;
  };

  const handleGenerate = async () => {
    setErrorMsg(null);
    if (!validatePrompt(prompt)) {
      return;
    }

    setIsGenerating(true);
    try {
      const url = await generateImage(prompt.trim(), aspectRatio);
      setIsGenerating(false);
      setResultUrl(url);
    } catch (err: any) {
      console.error("[ImageGenTool] Generation failed with error:", err);
      setErrorMsg(err.message || "An unexpected error occurred while generating the image. Please try again.");
      setIsGenerating(false);
    }
  };

  const triggerDownload = () => {
    if (!resultUrl) return;
    try {
      let extension = "png";
      if (resultUrl.startsWith("data:image/jpeg")) {
        extension = "jpg";
      }

      const link = document.createElement('a');
      link.href = resultUrl;
      link.download = `makepdfright-ai-${Date.now()}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("[ImageGenTool] Failed to download programmatically:", err);
      setErrorMsg("Automated download failed. Please right-click the image and select 'Save image as...'");
    }
  };

  const handleCopyPrompt = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="w-full space-y-6">
      <LoadingOverlay 
        isVisible={isGenerating} 
        message="Generating high-resolution visual with Gemini AI..." 
        error={errorMsg}
        onCloseError={() => setErrorMsg(null)}
        onCancel={() => setIsGenerating(false)}
      />

      <AnimatePresence mode="wait">
        {!resultUrl ? (
          /* ================= INPUT FORM STATE ================= */
          <motion.div
            key="input-form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Main Interactive Card */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-5 sm:p-7 shadow-xl shadow-slate-100/60 dark:shadow-none space-y-6">
              
              {/* 1. Prompt Description Field */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5 text-[#E5322D]" />
                    <span>Prompt Description</span>
                  </label>
                  <span className="text-xs font-medium text-slate-400">
                    {prompt.trim().length} chars
                  </span>
                </div>

                <div className="relative">
                  <textarea 
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    rows={4}
                    placeholder="Describe what you want to create in detail (e.g. 'A sleek modern isometric diagram of cloud network security with vibrant gradient highlights, high resolution, 4k')..."
                    className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 focus:border-[#E5322D] focus:ring-2 focus:ring-[#E5322D]/20 outline-none transition-all text-slate-900 dark:text-slate-100 text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500 resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-100 dark:bg-slate-700/60" />

              {/* 2. Aspect Ratio Selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-[#E5322D]" />
                    <span>Aspect Ratio</span>
                  </label>
                  <span className="text-xs font-semibold text-[#E5322D]">
                    {ratios.find(r => r.value === aspectRatio)?.desktopLabel}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {ratios.map((r) => {
                    const isSelected = aspectRatio === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => {
                          setAspectRatio(r.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-[#E5322D] bg-red-50/50 dark:bg-red-950/30 text-[#E5322D] shadow-sm' 
                            : 'border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="h-7 flex items-center justify-center mb-1.5">
                          <div 
                            className={`rounded-[3px] border-2 transition-colors ${
                              isSelected ? 'border-[#E5322D] bg-[#E5322D]' : 'border-slate-400 dark:border-slate-500 bg-transparent'
                            }`}
                            style={{ width: `${r.w}px`, height: `${r.h}px` }}
                          />
                        </div>
                        <span className="text-xs font-black leading-tight">{r.label}</span>
                        <span className={`text-[10px] font-bold leading-tight mt-0.5 ${isSelected ? 'text-[#E5322D]/90' : 'text-slate-400 dark:text-slate-500'}`}>
                          {r.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Primary Generate Button */}
              <button 
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full bg-[#E5322D] hover:bg-[#c92824] active:scale-[0.99] disabled:opacity-50 text-white font-extrabold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-500/25 transition-all text-base tracking-wide cursor-pointer"
              >
                <Sparkles className="w-5 h-5 fill-white/20" />
                <span>{isGenerating ? "Generating Image..." : "Generate AI Image"}</span>
              </button>

              {/* Trust Badge */}
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium text-center pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Generated in real-time with Google Gemini AI • No watermarks</span>
              </div>
            </div>

            {/* Feature Highlights Bento Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex flex-col items-center text-center gap-1.5 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Maximize2 className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">High Resolution</span>
                <span className="text-[10px] text-slate-400">Sharp 1024px clarity</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex flex-col items-center text-center gap-1.5 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">5 Aspect Ratios</span>
                <span className="text-[10px] text-slate-400">Square to widescreen</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex flex-col items-center text-center gap-1.5 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">PDF Ready</span>
                <span className="text-[10px] text-slate-400">Embed in documents</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex flex-col items-center text-center gap-1.5 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Instant Export</span>
                <span className="text-[10px] text-slate-400">Direct PNG/JPG file</span>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ================= RESULT SHOWCASE STATE ================= */
          <motion.div
            key="result-showcase"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-5 sm:p-7 shadow-xl shadow-slate-100/60 dark:shadow-none space-y-6"
          >
            {/* Result Header Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/60">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Image Generated
              </span>

              <button
                type="button"
                onClick={() => setResultUrl(null)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
              >
                + New Prompt
              </button>
            </div>

            {/* Generated Image Presentation Container */}
            <div className="w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-inner min-h-[300px] max-h-[520px]">
              <img 
                src={resultUrl} 
                alt={prompt || "AI generated visual"} 
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[520px] object-contain"
              />
            </div>

            {/* Prompt Recap Pill */}
            <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Prompt Used ({ratios.find(r => r.value === aspectRatio)?.desktopLabel})
                </span>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-500 font-bold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                "{prompt}"
              </p>
            </div>

            {/* Primary Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={triggerDownload}
                className="w-full bg-[#E5322D] hover:bg-[#c92824] active:scale-[0.99] text-white font-extrabold py-3.5 px-5 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-red-500/20 transition-all text-sm tracking-wide cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Image</span>
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 font-extrabold py-3.5 px-5 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all text-sm cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Regenerate Variant</span>
              </button>
            </div>

            {/* Reset / Create another image */}
            <div className="pt-2 flex flex-col items-center space-y-2">
              <button
                type="button"
                onClick={() => setResultUrl(null)}
                className="w-full py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 font-bold text-xs transition-colors cursor-pointer text-center"
              >
                Create Another Image
              </button>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
                🔒 Generated images are delivered directly to your device and never stored.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
