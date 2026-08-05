import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  ArrowLeft,
  Loader2,
  ImageIcon,
  RefreshCw,
  Maximize2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { generateImage } from '../services/gemini';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { SEO } from '../components/common/SEO';
import { SEO_DATA } from '../constants/seoData';
import { BackButton } from '../components/common/BackButton';

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

  React.useEffect(() => {
    if (resultUrl) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [resultUrl]);

  const ratios: AspectRatioOption[] = [
    { value: '1:1', label: '1:1', name: 'Square', desktopLabel: '1:1 (Square)', w: 20, h: 20 },
    { value: '4:3', label: '4:3', name: 'Landscape', desktopLabel: '4:3 (Landscape)', w: 24, h: 18 },
    { value: '16:9', label: '16:9', name: 'Widescreen', desktopLabel: '16:9 (Widescreen)', w: 26, h: 15 },
    { value: '3:4', label: '3:4', name: 'Portrait', desktopLabel: '3:4 (Portrait)', w: 16, h: 21 },
    { value: '9:16', label: '9:16', name: 'Story', desktopLabel: '9:16 (Story)', w: 12, h: 21 }
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
    console.log("[ImageGenTool] Starting image generation...", { prompt, aspectRatio });

    if (!validatePrompt(prompt)) {
      console.warn("[ImageGenTool] Validation failed for prompt:", prompt);
      return;
    }

    setIsGenerating(true);
    try {
      const url = await generateImage(prompt.trim(), aspectRatio);
      console.log("[ImageGenTool] Generation succeeded! URL base64 prefix:", url.substring(0, 30));
      
      setIsGenerating(false);
      setResultUrl(url);
    } catch (err: any) {
      console.error("[ImageGenTool] Generation failed with error:", err);
      setErrorMsg(err.message || "An unexpected error occurred. Please try again.");
      setIsGenerating(false);
    }
  };

  const triggerDownload = () => {
    if (!resultUrl) return;
    try {
      console.log("[ImageGenTool] Triggering base64 programmatic download...");
      
      // Determine file extension based on prefix
      let extension = "png";
      if (resultUrl.startsWith("data:image/jpeg")) {
        extension = "jpg";
      }

      const link = document.createElement('a');
      link.href = resultUrl;
      link.download = `makepdfright-${Date.now()}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log("[ImageGenTool] Download triggered successfully.");
    } catch (err) {
      console.error("[ImageGenTool] Failed to download programmatically:", err);
      setErrorMsg("Automated download failed. Please right-click the image below and select 'Save image as...'");
    }
  };

  return (
    <div className="relative">
      <SEO title={SEO_DATA['/generate-image'].title} description={SEO_DATA['/generate-image'].description} />
      {/* Navigation Header */}
      <div className="mb-6">
        <BackButton label="Back to Home" />
      </div>

      <LoadingOverlay 
        isVisible={isGenerating} 
        message="Creating your masterpiece..." 
        error={errorMsg}
        onCloseError={() => setErrorMsg(null)}
      />

      {/* MOBILE LAYOUT (md:hidden) */}
      <div className="block md:hidden space-y-4">
        <div className="space-y-1 mb-2">
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">AI Image Generator</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Create high-quality custom visual assets for your PDFs instantly.</p>
        </div>

        {!resultUrl ? (
          /* Mobile Input State */
          <div className="space-y-4">
            {/* Single Consolidated Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 shadow-sm space-y-3.5">
              {/* Prompt Textarea */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Prompt Description
                  </label>
                  <span className="text-[11px] font-medium text-slate-400">{prompt.trim().length} chars</span>
                </div>
                <textarea 
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Describe the image in detail..."
                  className="w-full h-28 px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 focus:border-[#E5322D] focus:ring-1 focus:ring-[#E5322D] outline-none transition-all text-slate-800 dark:text-slate-100 text-xs font-medium placeholder-slate-400 dark:placeholder-slate-600 resize-none"
                />
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-100 dark:bg-slate-700/60 my-1" />

              {/* Aspect Ratio Picker (Horizontal Pill Row) */}
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Aspect Ratio
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none -mx-1 px-1">
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
                        className={`flex-shrink-0 flex flex-col items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-[#E5322D] bg-red-50/50 dark:bg-red-950/40 text-[#E5322D]' 
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div 
                          className={`rounded-[2px] border transition-colors ${
                            isSelected ? 'border-[#E5322D] bg-[#E5322D]' : 'border-slate-400 dark:border-slate-500 bg-transparent'
                          }`}
                          style={{ width: `${r.w}px`, height: `${r.h}px` }}
                        />
                        <span className="text-xs font-extrabold leading-none">{r.label}</span>
                        <span className={`text-[9.5px] font-semibold leading-none ${isSelected ? 'text-[#E5322D]/80' : 'text-slate-400 dark:text-slate-500'}`}>
                          {r.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Generate Button below card */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-[#E5322D] hover:bg-[#c92824] disabled:opacity-50 text-white font-extrabold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-sm tracking-wide cursor-pointer active:scale-[0.99]"
            >
              <span>{isGenerating ? "Generating Custom Image..." : "✨ Generate Image"}</span>
            </button>

            {/* Trust Note */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500 text-center">
              <span>🔒 Images are not stored after generation</span>
            </div>
          </div>
        ) : (
          /* Mobile Result State */
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 shadow-sm space-y-3.5">
              {/* Generated Image */}
              <div className="rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-200 dark:border-slate-700 max-h-[380px]">
                <img 
                  src={resultUrl} 
                  alt="Generated asset" 
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-[380px] object-contain" 
                />
              </div>

              {/* Prompt Recap */}
              <div className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                <span className="font-bold text-slate-700 dark:text-slate-200">Prompt: </span>
                {prompt}
              </div>

              {/* Action Buttons Side-by-Side */}
              <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                <button
                  onClick={triggerDownload}
                  className="bg-[#E5322D] hover:bg-[#c92824] text-white font-extrabold py-3 px-3 rounded-xl flex items-center justify-center gap-2 text-xs shadow-sm transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="border border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 text-slate-700 dark:text-slate-200 font-bold py-3 px-3 rounded-xl flex items-center justify-center gap-2 text-xs bg-white dark:bg-slate-800 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Regenerate</span>
                </button>
              </div>
            </div>

            {/* Start a new image button */}
            <button
              onClick={() => setResultUrl(null)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3.5 px-4 rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all cursor-pointer shadow-xs"
            >
              Start a new image
            </button>

            {/* Trust Note */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500 text-center">
              <span>🔒 Images are not stored after generation</span>
            </div>
          </div>
        )}
      </div>

      {/* DESKTOP LAYOUT (hidden md:block) */}
      <div className="hidden md:block space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">AI Image Generator</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Create high-quality custom visual assets for your PDFs instantly.</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 items-start">
          {/* Left/Main Column: Form & Result */}
          <div className="flex-1 space-y-8 w-full">
            {/* Form Card */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-8 shadow-xl shadow-slate-100 dark:shadow-none space-y-8">
            
            {/* Prompt Textarea */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Prompt Description</label>
                <span className="text-xs font-medium text-slate-400">{prompt.trim().length} chars</span>
              </div>
              <textarea 
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Describe the image in detail... (e.g. 'A cozy reading nook in a wooden cabin, warm fireplace light, soft focus, cinematic lighting, 4k resolution')"
                className="w-full h-32 px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary outline-none transition-all text-slate-800 dark:text-slate-100 font-medium placeholder-slate-400 dark:placeholder-slate-600 resize-none shadow-inner"
              />
            </div>

            {/* Aspect Ratio Picker */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Aspect Ratio</label>
              <div className="flex flex-wrap gap-2.5">
                {ratios.map((ratio) => (
                  <button
                    key={ratio.value}
                    type="button"
                    onClick={() => {
                      setAspectRatio(ratio.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className={`px-4 py-2.5 rounded-xl border-2 font-bold text-xs transition-all cursor-pointer ${
                      aspectRatio === ratio.value 
                        ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20' 
                        : 'border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
                    }`}
                  >
                    {ratio.desktopLabel}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">
                Dynamically maps your chosen aspect ratio to tailored high-definition dimensions (e.g. 1024x576 for widescreen).
              </p>
            </div>

            {/* Action Trigger */}
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="btn-primary w-full py-4 text-base font-extrabold flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-primary/25 active:scale-[0.99]"
            >
              <span>{isGenerating ? "Generating Custom Image..." : "Generate Custom Image"}</span>
              <Sparkles className="w-5 h-5 fill-white/10" />
            </button>
          </div>

          {/* Result Showcase Card */}
          <AnimatePresence>
            {resultUrl && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-8 shadow-xl shadow-slate-100 dark:shadow-none space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-emerald-500">
                    <CheckCircle2 className="w-5.5 h-5.5 fill-emerald-500/10" />
                    <h4 className="text-lg font-extrabold text-slate-800 dark:text-white">AI Image Ready!</h4>
                  </div>
                  <div className="flex gap-2.5">
                    <button 
                      onClick={triggerDownload}
                      className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-300 hover:text-primary hover:border-primary/30 transition-all cursor-pointer"
                      title="Download generated image"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={handleGenerate}
                      className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-300 hover:text-primary hover:border-primary/30 transition-all cursor-pointer"
                      title="Regenerate image"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Displaying Image with correct aspect ratio framing */}
                <div className="rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800/80 shadow-inner max-h-[500px]">
                  <img 
                    src={resultUrl} 
                    alt="Generated custom asset" 
                    referrerPolicy="no-referrer"
                    className="max-w-full max-h-[500px] object-contain transition-all duration-300" 
                  />
                </div>
                
                <p className="text-xs text-center text-slate-400 dark:text-slate-500 font-medium">
                  Tip: Right-click the image and click "Save Image As..." if the automated download is blocked in your iframe browser.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Sidebar: Contextual Guide & Capabilities */}
        <div className="w-full lg:w-[350px] space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 p-8 shadow-xl shadow-slate-100 dark:shadow-none space-y-6">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Features & Capabilities</h4>
            
            <div className="space-y-3.5">
              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Maximize2 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">1K High Resolution</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Sharp details and rich compositions.</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <ImageIcon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Perfect Ratios</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Optimized for vertical documents or banners.</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <ShieldCheck className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Content Moderation</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Automated safety filters for safe assets.</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#E5322D]/5 dark:bg-[#E5322D]/10 border border-[#E5322D]/20 dark:border-[#E5322D]/30">
                <div className="w-9 h-9 rounded-xl bg-[#E5322D]/10 flex items-center justify-center text-[#E5322D]">
                  <FileText className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#E5322D]">PDF-Ready Output</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Insert directly into documents, decks, and covers.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};
