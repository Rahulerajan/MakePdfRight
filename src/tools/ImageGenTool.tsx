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
  AlertCircle
} from 'lucide-react';
import { generateImage } from '../services/gemini';
import { LoadingOverlay } from '../components/common/LoadingOverlay';

interface AspectRatioOption {
  value: string;
  label: string;
}

export const ImageGenTool: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const ratios: AspectRatioOption[] = [
    { value: '1:1', label: '1:1 (Square)' },
    { value: '4:3', label: '4:3 (Landscape)' },
    { value: '16:9', label: '16:9 (Widescreen)' },
    { value: '3:4', label: '3:4 (Portrait)' },
    { value: '9:16', label: '9:16 (Story)' }
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
      setTimeout(() => {
        setResultUrl(url);
      }, 1500);
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
      {/* Navigation Header */}
      <div className="absolute -top-12 left-0">
        <Link 
          to="/"
          className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors group font-bold text-sm"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to Home
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        <LoadingOverlay 
          isVisible={isGenerating} 
          message="Creating your masterpiece..." 
          error={errorMsg}
          onCloseError={() => setErrorMsg(null)}
        />

        {/* Left/Main Column: Form & Result */}
        <div className="flex-1 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">AI Image Generator</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Create high-quality custom visual assets for your PDFs instantly.</p>
            </div>
          </div>

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
                    {ratio.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">
                Pollinations AI dynamically maps your chosen aspect ratio to tailored high-definition dimensions (e.g. 1024x576 for widescreen).
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
            </div>

            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <p className="text-xs text-primary font-bold leading-relaxed">
                Generate tailored visual material to insert directly into PDF documents, presentations, and digital covers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
