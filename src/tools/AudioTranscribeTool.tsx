import React, { useState, useRef, useEffect } from 'react';
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
  ArrowLeft,
  Copy,
  Check,
  Pause,
  Play,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { transcribeAudio } from '../services/gemini';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { FileUpload } from '../components/common/FileUpload';
import { SEO } from '../components/common/SEO';
import { SEO_DATA } from '../constants/seoData';
import { jsPDF } from 'jspdf';
import { useLanguage } from '../components/LanguageContext';
import { BackButton } from '../components/common/BackButton';
import { ResultPanel } from '../components/common/ResultPanel';

export const AudioTranscribeTool: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'record' | 'upload'>('record');
  const [chosenLanguage, setChosenLanguage] = useState<string>('auto');
  
  // Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timer, setTimer] = useState(0);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  
  // Upload States
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileDuration, setFileDuration] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Common Result States
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string>('');

  // Live Web Speech Recognition State
  const [liveFinalText, setLiveFinalText] = useState<string>('');
  const [liveInterimText, setLiveInterimText] = useState<string>('');
  const speechRecognitionRef = useRef<any>(null);

  // Generate Blob URL for txt download when transcription changes
  useEffect(() => {
    if (transcription) {
      const blob = new Blob([transcription], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setDownloadUrl('');
    }
  }, [transcription]);

  // Helper to map UI language option to BCP-47 tag for SpeechRecognition
  const getBcp47Lang = (lang: string): string => {
    switch (lang) {
      case 'English': return 'en-US';
      case 'Hindi': return 'hi-IN';
      case 'French': return 'fr-FR';
      case 'German': return 'de-DE';
      case 'Spanish': return 'es-ES';
      case 'auto':
      default:
        return navigator.language || 'en-US';
    }
  };

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Visualizer Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mobileCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const isPausedRef = useRef(isPaused);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    if (transcription) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [transcription]);

  // Check Permission status on mount
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' as any })
        .then((permissionStatus) => {
          setPermissionStatus(permissionStatus.state as any);
          permissionStatus.onchange = () => {
            setPermissionStatus(permissionStatus.state as any);
          };
        })
        .catch((err) => {
          console.warn("Could not query microphone permission status:", err);
        });
    }

    return () => {
      stopTimer();
      stopVisualizer();
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch (e) {}
        speechRecognitionRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Timer functions
  const startTimer = () => {
    setTimer(0);
    timerIntervalRef.current = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
  };

  const pauseTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const resumeTimer = () => {
    timerIntervalRef.current = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Audio Visualizer functions
  const startVisualizer = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64; // Small fftSize for clean stylized waveform/bars
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioCtxRef.current = audioContext;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!analyserRef.current) return;
        
        const isPausedNow = isPausedRef.current;
        if (!isPausedNow) {
          analyserRef.current.getByteFrequencyData(dataArray);
        }

        const drawToCanvas = (canvas: HTMLCanvasElement | null) => {
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          const width = canvas.width;
          const height = canvas.height;
          ctx.clearRect(0, 0, width, height);

          const barWidth = (width / bufferLength) * 0.8;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const value = isPausedNow ? 0 : dataArray[i];
            const barHeight = isPausedNow ? 2 : Math.max(2, (value / 255) * height * 0.8);
            ctx.fillStyle = isPausedNow ? '#94a3b8' : '#E5322D';
            const y = (height - barHeight) / 2;
            ctx.fillRect(x, y, barWidth, barHeight);
            x += barWidth + 4;
          }
        };

        drawToCanvas(canvasRef.current);
        drawToCanvas(mobileCanvasRef.current);

        animationRef.current = requestAnimationFrame(draw);
      };

      draw();
    } catch (err) {
      console.warn("Failed to initialize Web Audio API visualizer:", err);
    }
  };

  const stopVisualizer = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  };

  // Recording actions
  const startRecording = async () => {
    setError(null);
    setTranscription(null);
    setConfidence(null);
    setDetectedLanguage(null);
    setLiveFinalText('');
    setLiveInterimText('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionStatus('granted');
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        await handleTranscribe(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setIsPaused(false);
      startTimer();
      startVisualizer(stream);

      // Start Web Speech API recognition in parallel if supported
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        try {
          const recognition = new SpeechRecognitionClass();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = getBcp47Lang(chosenLanguage);

          recognition.onresult = (event: any) => {
            let finalAcc = '';
            let interimAcc = '';

            for (let i = 0; i < event.results.length; i++) {
              const res = event.results[i];
              if (res.isFinal) {
                finalAcc += res[0].transcript + ' ';
              } else {
                interimAcc += res[0].transcript;
              }
            }

            setLiveFinalText(finalAcc);
            setLiveInterimText(interimAcc);
          };

          recognition.onerror = (e: any) => {
            console.warn('SpeechRecognition error:', e.error);
          };

          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch (srErr) {
          console.warn('Could not start SpeechRecognition:', srErr);
        }
      }
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      setPermissionStatus('denied');
      setError("Could not access microphone. Please check permissions in your browser.");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      pauseTimer();
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch (e) {}
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      resumeTimer();
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.start(); } catch (e) {}
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      stopTimer();
      stopVisualizer();
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch (e) {}
        speechRecognitionRef.current = null;
      }
    }
  };

  // Upload Actions
  const handleFileSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    
    // Support MP3, WAV, M4A, AAC, FLAC, OGG, WEBM, MP4 (audio track)
    const allowedExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.webm', '.mp4'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedExtensions.includes(fileExt) && !file.type.startsWith('audio/')) {
      setError("Unsupported format. Please upload an MP3, WAV, M4A, AAC, FLAC, OGG, WEBM, or MP4 file.");
      return;
    }
    
    // 25MB Limit
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("File is too large. Maximum size allowed is 25MB.");
      return;
    }
    
    setError(null);
    setUploadedFile(file);
    setIsUploading(true);
    setUploadProgress(0);
    
    // Simulated upload / read progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 80);

    // Read duration
    try {
      const dur = await getAudioDuration(file);
      setFileDuration(dur);
    } catch (err) {
      console.warn("Could not determine duration:", err);
      setFileDuration(null);
    }
  };

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          audio.src = e.target.result as string;
          audio.onloadedmetadata = () => {
            resolve(audio.duration);
          };
          audio.onerror = () => {
            resolve(0);
          };
        } else {
          resolve(0);
        }
      };
      reader.onerror = () => resolve(0);
      reader.readAsDataURL(file);
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const transcribeUploadedFile = async () => {
    if (!uploadedFile) return;
    await handleTranscribe(uploadedFile);
  };

  // Common transcription handler
  const handleTranscribe = async (blob: Blob) => {
    setError(null);
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const result = await transcribeAudio(base64, blob.type, chosenLanguage);
          
          setIsProcessing(false);
          setTranscription(result.text);
          setConfidence(result.confidence);
          if (result.detectedLanguage) {
            setDetectedLanguage(result.detectedLanguage);
          }
        } catch (err: any) {
          console.error('Transcription failed:', err);
          setError(err.message || 'An error occurred while transcribing your audio. Please try again.');
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(blob);
    } catch (err: any) {
      console.error('Reading audio file failed:', err);
      setError(err.message || 'An error occurred while reading the audio data.');
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

  const downloadTXT = () => {
    if (!transcription) return;
    const blob = new Blob([transcription], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${uploadedFile ? uploadedFile.name.split('.')[0] : 'transcription'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    if (!transcription) return;
    const doc = new jsPDF();
    
    // Frame PDF cleanly
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Audio Transcription', 14, 22);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
    if (chosenLanguage && chosenLanguage !== 'auto') {
      doc.text(`Target Language: ${chosenLanguage}`, 14, 34);
    }
    if (detectedLanguage) {
      doc.text(`Detected Language: ${detectedLanguage}`, 14, 40);
    }
    if (confidence !== null) {
      doc.text(`Transcription Confidence: ${confidence}%`, 14, 46);
    }
    
    doc.setDrawColor(220, 220, 220);
    doc.line(14, 50, 196, 50);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    
    const splitText = doc.splitTextToSize(transcription, 180);
    let y = 60;
    
    splitText.forEach((line: string) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 14, y);
      y += 6;
    });
    
    doc.save(`${uploadedFile ? uploadedFile.name.split('.')[0] : 'transcription'}.pdf`);
  };

  const clearAll = () => {
    setTranscription(null);
    setConfidence(null);
    setDetectedLanguage(null);
    setUploadedFile(null);
    setFileDuration(null);
    setUploadProgress(0);
    setError(null);
    setLiveFinalText('');
    setLiveInterimText('');
  };

  return (
    <div className="relative space-y-6">
      <SEO title={SEO_DATA['/transcribe'].title} description={SEO_DATA['/transcribe'].description} />
      <div className="mb-3">
        <BackButton label={t('back_home')} />
      </div>

      <LoadingOverlay 
        isVisible={false} 
        message={t('ai.transcribing')} 
        error={error}
        onCloseError={() => setError(null)}
      />

      {/* Header Section */}
      <div className="text-center space-y-2 max-w-xl mx-auto mb-6">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          {t('ai.transcribe_title')}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          {t('ai.transcribe_subtitle')}
        </p>
      </div>

      {/* SINGLE PANEL FLOW ACROSS ALL 4 STATES */}
      
      {/* 3. PROCESSING STATE */}
      {isProcessing ? (
        <div className="w-full max-w-[540px] mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 bg-[#E5322D]/10 rounded-full flex items-center justify-center mx-auto text-[#E5322D]">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Transcribing your audio...
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              This usually takes a few seconds
            </p>
          </div>
        </div>
      ) : transcription ? (
        /* 4. RESULT STATE - using ResultPanel directly */
        <div className="w-full max-w-2xl mx-auto">
          <ResultPanel
            icon={<CheckCircle2 className="w-10 h-10 md:w-12 md:h-12" />}
            title="Transcription complete!"
            subtitle="Your audio has been converted to text"
            details={[
              {
                label: detectedLanguage 
                  ? `Language: ${detectedLanguage}` 
                  : (chosenLanguage !== 'auto' ? `Language: ${chosenLanguage}` : 'Language: Auto-detected')
              },
              {
                label: `${transcription.trim().split(/\s+/).filter(Boolean).length} words`
              },
              {
                label: timer > 0 ? formatTime(timer) : (fileDuration ? formatDuration(fileDuration) : '00:00')
              }
            ]}
            downloadUrl={downloadUrl}
            downloadFileName={`${uploadedFile ? uploadedFile.name.split('.')[0] : 'transcription'}.txt`}
            downloadLabel="Download (.txt)"
            onReset={clearAll}
            resetLabel="Transcribe another recording"
          >
            <div className="w-full space-y-3">
              {/* Transcript Text Box */}
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 text-left text-sm text-slate-800 dark:text-slate-100 font-medium leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap select-text shadow-xs">
                {transcription}
              </div>

              {/* Action buttons inside children slot */}
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="btn-secondary flex-1 py-3 px-4 text-xs sm:text-sm font-extrabold cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Text'}</span>
                </button>
                <button
                  type="button"
                  onClick={downloadPDF}
                  className="btn-secondary flex-1 py-3 px-4 text-xs sm:text-sm font-extrabold cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          </ResultPanel>
        </div>
      ) : isRecording ? (
        /* 2. RECORDING STATE */
        <div className="w-full max-w-[540px] mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-xl space-y-6">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Audio Input Mode
            </span>
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full text-xs font-extrabold shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Private & Local</span>
            </span>
          </div>

          {/* Timer & Status */}
          <div className="space-y-2 text-center">
            <div className="font-mono text-4xl md:text-5xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              {formatTime(timer)}
            </div>
            {isPaused ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 text-xs font-extrabold">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Recording Paused</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-extrabold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>● Live Recording</span>
              </div>
            )}
          </div>

          {/* Live Waveform Canvas */}
          <div className="w-full h-16 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-2 flex items-center justify-center">
            <canvas 
              ref={canvasRef} 
              className="w-full h-12" 
              width={400} 
              height={48}
            />
          </div>

          {/* Live streaming text preview if available */}
          {(liveFinalText || liveInterimText) && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl text-left text-xs text-slate-700 dark:text-slate-300 max-h-24 overflow-y-auto">
              <span>{liveFinalText}</span>
              <span className="text-slate-400 italic">{liveInterimText}</span>
            </div>
          )}

          {/* Recording Action Buttons: Pause/Resume + Stop & Transcribe */}
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="btn-secondary flex-1 py-3.5 px-4 text-xs sm:text-sm font-extrabold cursor-pointer"
            >
              {isPaused ? (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={stopRecording}
              className="btn-primary flex-1 py-3.5 px-4 text-xs sm:text-sm font-extrabold cursor-pointer"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Stop & Transcribe</span>
            </button>
          </div>

          <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-xs text-slate-400 font-medium">
              🔒 Audio is transcribed in memory & never stored
            </span>
          </div>
        </div>
      ) : (
        /* 1. INPUT STATE */
        <div className="w-full max-w-[540px] mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-xl space-y-6">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Audio Input Mode
            </span>
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full text-xs font-extrabold shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Private & Local</span>
            </span>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl w-full gap-1">
            <button
              type="button"
              onClick={() => { setActiveTab('record'); setError(null); }}
              disabled={isRecording || isProcessing}
              className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-extrabold rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 ${
                activeTab === 'record'
                  ? 'bg-white dark:bg-slate-900 text-[#E5322D] shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Start Recording
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('upload'); setError(null); }}
              disabled={isRecording || isProcessing}
              className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-extrabold rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 ${
                activeTab === 'upload'
                  ? 'bg-white dark:bg-slate-900 text-[#E5322D] shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Upload Audio File
            </button>
          </div>

          {/* Language Selection Dropdown */}
          <div className="space-y-2 text-left">
            <label className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Audio Language
            </label>
            <select
              value={chosenLanguage}
              onChange={(e) => setChosenLanguage(e.target.value)}
              disabled={isRecording || isProcessing}
              className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#E5322D] disabled:opacity-50 cursor-pointer transition-all"
            >
              <option value="auto">Auto Detect Language</option>
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="French">French</option>
              <option value="German">German</option>
              <option value="Spanish">Spanish</option>
            </select>
          </div>

          {/* Active Tab Content */}
          {activeTab === 'record' ? (
            <div className="flex flex-col items-center justify-center space-y-5 text-center pt-2">
              <div className="space-y-1">
                <div className="font-mono text-4xl md:text-5xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                  {formatTime(timer)}
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Ready to capture audio
                </p>
              </div>

              <button
                type="button"
                onClick={startRecording}
                disabled={isProcessing}
                className="w-20 h-20 rounded-full bg-[#E5322D] hover:bg-[#c92824] text-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shadow-[0_20px_40px_-8px_rgba(229,50,45,0.45)] ring-8 ring-[#E5322D]/10"
                title="Start Recording"
              >
                <Mic className="w-8 h-8" />
              </button>

              {permissionStatus === 'denied' && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl text-xs text-red-500 dark:text-red-400 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Microphone blocked. Please grant access in browser settings.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {!uploadedFile ? (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <FileUpload 
                    onFilesSelected={handleFileSelected} 
                    accept={{ 'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.webm'], 'video/mp4': ['.mp4'] }}
                  />
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#E5322D]/10 rounded-xl flex items-center justify-center text-[#E5322D] shrink-0">
                      <FileAudio className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0 text-left space-y-0.5">
                      <h5 className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate" title={uploadedFile.name}>
                        {uploadedFile.name}
                      </h5>
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                        <span>{formatFileSize(uploadedFile.size)}</span>
                        {fileDuration !== null && (
                          <>
                            <span>•</span>
                            <span>{formatDuration(fileDuration)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadedFile(null)}
                      className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {!isUploading && (
                    <button
                      type="button"
                      onClick={transcribeUploadedFile}
                      disabled={isProcessing}
                      className="btn-primary w-full py-3 px-4 text-sm font-extrabold cursor-pointer"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Transcribing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Transcribe Audio File</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              <div className="text-xs text-slate-400 font-medium text-center">
                Supported formats: MP3, WAV, M4A, AAC, FLAC, OGG, WEBM, MP4 (max 25MB)
              </div>
            </div>
          )}

          <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-xs text-slate-400 font-medium">
              🔒 Audio is transcribed in memory & never stored
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
