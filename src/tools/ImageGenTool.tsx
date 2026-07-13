import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  ArrowRight,
  ArrowLeft,
  Loader2,
  ImageIcon,
  RefreshCw,
  Maximize2
} from 'lucide-react';
import { generateImage } from '../services/gemini';
import { LoadingOverlay } from '../components/common/LoadingOverlay';

export const ImageGenTool: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const ratios = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'];

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    try {
      const url = await generateImage(prompt, aspectRatio);
      setResultUrl(url);
    } catch (error) {
      console.error('Generation failed:', error);
      alert("Sorry, I couldn't generate the image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative">
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
        <LoadingOverlay isVisible={isGenerating} message="Gemini is generating your image..." />

      {/* Main Area: Prompt & Result */}
      <div className="flex-1 space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">AI Image Generator</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Powered by Gemini 3 Pro Image</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-xl space-y-8">
          <div className="space-y-4">
            <label className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Prompt</label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to create... (e.g., 'A futuristic city in the clouds at sunset')"
              className="w-full h-32 px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-primary outline-none transition-all text-lg font-medium resize-none"
            />
          </div>

          <div className="space-y-4">
            <label className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Aspect Ratio</label>
            <div className="flex flex-wrap gap-3">
              {ratios.map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`px-4 py-2 rounded-xl border-2 font-bold text-sm transition-all ${
                    aspectRatio === ratio 
                      ? 'border-primary bg-primary text-white' 
                      : 'border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-600'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="btn-primary w-full py-5 text-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-95"
          >
            Generate Image
            <Sparkles className="w-6 h-6" />
          </button>
        </div>

        {/* Result Display */}
        <AnimatePresence>
          {resultUrl && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-xl space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-emerald-500">
                  <CheckCircle2 className="w-6 h-6" />
                  <h4 className="text-lg font-bold">Image Generated!</h4>
                </div>
                <div className="flex gap-4">
                  <a 
                    href={resultUrl} 
                    download="generated_image.png"
                    className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
                    title="Download"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                  <button 
                    onClick={handleGenerate}
                    className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
                    title="Regenerate"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="aspect-video rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800">
                <img src={resultUrl} alt="Generated" className="w-full h-full object-contain" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sidebar: Features */}
      <div className="w-full lg:w-[360px] space-y-8">
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-xl space-y-8">
          <div className="space-y-6">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Capabilities</h4>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <Maximize2 className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">1K Resolution</span>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <ImageIcon className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Multiple Ratios</span>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">AI Safety Filters</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <p className="text-sm text-primary font-medium leading-relaxed">
                Gemini 3 Pro Image can generate high-quality images from text descriptions in various aspect ratios.
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
