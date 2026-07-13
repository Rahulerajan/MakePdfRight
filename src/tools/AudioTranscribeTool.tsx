import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  Square, 
  Loader2, 
  Volume2, 
  FileAudio,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check
} from 'lucide-react';
import { transcribeAudio } from '../services/gemini';
import { LoadingOverlay } from '../components/common/LoadingOverlay';

export const AudioTranscribeTool: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await handleTranscribe(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTranscribe = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const result = await transcribeAudio(base64, blob.type);
        setTranscription(result);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Transcription failed:', error);
      setTranscription("Sorry, I couldn't transcribe the audio. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = () => {
    if (transcription) {
      navigator.clipboard.writeText(transcription);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
        <LoadingOverlay isVisible={isProcessing} message="Gemini is transcribing your audio..." />

      {/* Main Area: Recording & Result */}
      <div className="flex-1 space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Audio Transcription</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Powered by Gemini 3 Flash</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Recording Controls */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-12 shadow-xl flex flex-col items-center justify-center space-y-8 text-center">
            <div className="relative">
              <AnimatePresence>
                {isRecording && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 0.2 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0 bg-primary rounded-full"
                  />
                )}
              </AnimatePresence>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                  isRecording 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-primary text-white hover:bg-primary-hover'
                }`}
              >
                {isRecording ? <Square className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
              </button>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                {isRecording ? 'Recording...' : 'Click to record'}
              </h4>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                {isRecording ? 'Speak clearly into your microphone' : 'Start speaking to transcribe your audio'}
              </p>
            </div>
          </div>

          {/* Transcription Result */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-primary" />
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Transcription</h4>
              </div>
              {transcription && (
                <button 
                  onClick={copyToClipboard}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto min-h-[200px]">
              {transcription ? (
                <div className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {transcription}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center">
                    <Volume2 className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-slate-400 text-sm">Your transcription will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar: Info */}
      <div className="w-full lg:w-[360px] space-y-8">
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-xl space-y-8">
          <div className="space-y-6">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Features</h4>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <Mic className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Live Recording</span>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <Zap className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Fast Processing</span>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Secure & Private</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <p className="text-sm text-primary font-medium leading-relaxed">
                Gemini 3 Flash provides high-accuracy transcription for various audio formats and languages.
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
