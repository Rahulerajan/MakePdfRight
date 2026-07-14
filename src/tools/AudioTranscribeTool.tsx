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
  AlertCircle
} from 'lucide-react';
import { transcribeAudio } from '../services/gemini';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { FileUpload } from '../components/common/FileUpload';
import { jsPDF } from 'jspdf';
import { useLanguage } from '../components/LanguageContext';

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

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Visualizer Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

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
        if (!canvasRef.current || !analyserRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        analyserRef.current.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, width, height);

        // draw audio frequency bars symmetrically from the center
        const barWidth = (width / bufferLength) * 0.8;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          // Normalize value
          const value = dataArray[i];
          const barHeight = (value / 255) * height * 0.8;
          
          // Primary colors for stylized gradient bar representation
          ctx.fillStyle = '#6366f1'; // primary Tailwind Indigo
          
          const y = (height - barHeight) / 2;
          ctx.fillRect(x, y, barWidth, barHeight);
          x += barWidth + 4;
        }

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
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      resumeTimer();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      stopTimer();
      stopVisualizer();
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
  };

  return (
    <div className="relative">
      <div className="absolute -top-12 left-0">
        <Link 
          to="/"
          className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors group font-bold text-sm"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          {t('back_home')}
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        <LoadingOverlay 
          isVisible={isProcessing} 
          message={t('ai.transcribing')} 
          error={error}
          onCloseError={() => setError(null)}
        />

        {/* Main Area: Inputs & Result */}
        <div className="flex-1 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{t('ai.transcribe_title')}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t('ai.transcribe_subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Card: Input Panel */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-xl flex flex-col space-y-6">
              
              {/* Tab Toggles */}
              <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-2xl w-full">
                <button
                  onClick={() => { setActiveTab('record'); setError(null); }}
                  disabled={isRecording || isProcessing}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 disabled:opacity-50 ${
                    activeTab === 'record'
                      ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {t('ai.record_start')}
                </button>
                <button
                  onClick={() => { setActiveTab('upload'); setError(null); }}
                  disabled={isRecording || isProcessing}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 disabled:opacity-50 ${
                    activeTab === 'upload'
                      ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {t('ai.upload_audio')}
                </button>
              </div>

              {/* Language Selection */}
              <div className="w-full flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Audio Language
                </label>
                <select
                  value={chosenLanguage}
                  onChange={(e) => setChosenLanguage(e.target.value)}
                  disabled={isRecording || isProcessing}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 transition-all"
                >
                  <option value="auto">Auto Detect Language</option>
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Spanish">Spanish</option>
                </select>
              </div>

              {/* Tab Contents: Live Recorder */}
              {activeTab === 'record' && (
                <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center py-6">
                  {/* Visualizer & Timer */}
                  <div className="w-full space-y-4 flex flex-col items-center">
                    <div className="flex items-center gap-3">
                      {isRecording && (
                        <span className="relative flex h-3 w-3">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPaused ? 'bg-amber-400' : 'bg-red-400'}`}></span>
                          <span className={`relative inline-flex rounded-full h-3 w-3 ${isPaused ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                        </span>
                      )}
                      <span className="font-mono text-3xl font-extrabold text-slate-900 dark:text-white">
                        {formatTime(timer)}
                      </span>
                    </div>

                    {/* Canvas Waveform */}
                    {(isRecording && !isPaused) ? (
                      <canvas 
                        ref={canvasRef} 
                        className="w-full h-12 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/80" 
                        width={280} 
                        height={48}
                      />
                    ) : (
                      <div className="w-full h-12 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800/80 flex items-center justify-center">
                        <span className="text-xs text-slate-400">
                          {isPaused ? 'Audio capturing paused' : 'Microphone idle'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-4">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        disabled={isProcessing}
                        className="w-16 h-16 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 disabled:opacity-50"
                        title="Start Recording"
                      >
                        <Mic className="w-7 h-7" />
                      </button>
                    ) : (
                      <>
                        {/* Pause / Resume */}
                        {isPaused ? (
                          <button
                            onClick={resumeRecording}
                            className="w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-md transition-transform hover:scale-105"
                            title="Resume Recording"
                          >
                            <Play className="w-5 h-5 ml-0.5" />
                          </button>
                        ) : (
                          <button
                            onClick={pauseRecording}
                            className="w-12 h-12 rounded-full bg-slate-500 hover:bg-slate-600 text-white flex items-center justify-center shadow-md transition-transform hover:scale-105"
                            title="Pause Recording"
                          >
                            <Pause className="w-5 h-5" />
                          </button>
                        )}

                        {/* Stop */}
                        <button
                          onClick={stopRecording}
                          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
                          title="Stop and Transcribe"
                        >
                          <Square className="w-6 h-6 fill-white" />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {isRecording ? (isPaused ? 'Recording Paused' : 'Recording Live...') : 'Click Mic to Record'}
                    </h4>
                    <p className="text-xs text-slate-400 max-w-[240px] mx-auto">
                      {isRecording ? 'Your audio is being recorded in high definition.' : 'Speak clearly to capture verbatim transcripts.'}
                    </p>
                  </div>

                  {/* Permission Status Check */}
                  {permissionStatus === 'denied' && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-xs text-red-500 dark:text-red-400 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Microphone blocked. Please grant access in address bar.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Tab Contents: Audio File Upload */}
              {activeTab === 'upload' && (
                <div className="flex-1 flex flex-col space-y-4">
                  {!uploadedFile ? (
                    <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                      <FileUpload 
                        onFilesSelected={handleFileSelected} 
                        accept={{ 'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.webm'], 'video/mp4': ['.mp4'] }}
                      />
                    </div>
                  ) : (
                    <div className="p-5 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                          <FileAudio className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <h5 className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate" title={uploadedFile.name}>
                            {uploadedFile.name}
                          </h5>
                          <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                            <span>{formatFileSize(uploadedFile.size)}</span>
                            {fileDuration !== null && (
                              <>
                                <span>•</span>
                                <span>Duration: {formatDuration(fileDuration)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setUploadedFile(null)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors"
                          title="Remove file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Upload / Read progress bar */}
                      {isUploading && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                            <span>Analyzing audio track...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all duration-100" 
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Transcribe trigger */}
                      {!isUploading && (
                        <button
                          onClick={transcribeUploadedFile}
                          disabled={isProcessing}
                          className="w-full py-3 px-4 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Transcribing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              Transcribe Audio File
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 font-medium text-center">
                    Supported: MP3, WAV, M4A, AAC, FLAC, OGG, WEBM, MP4 (max 25MB)
                  </div>
                </div>
              )}

            </div>

            {/* Right Card: Transcription Result Panel */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-xl flex flex-col h-full min-h-[420px]">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">Transcription</h4>
                </div>
                {transcription && (
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={copyToClipboard}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={clearAll}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors"
                      title="Clear session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Badges / Meta Info */}
              {transcription && (confidence !== null || detectedLanguage) && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {detectedLanguage && (
                    <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-[11px] font-bold text-blue-600 dark:text-blue-400 rounded-full">
                      Language: {detectedLanguage}
                    </span>
                  )}
                  {confidence !== null && (
                    <span className={`px-3 py-1 border text-[11px] font-bold rounded-full ${
                      confidence >= 80 
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400' 
                        : confidence >= 50 
                          ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30 text-amber-600 dark:text-amber-400'
                          : 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400'
                    }`}>
                      Confidence: {confidence}% {confidence >= 80 ? 'High' : confidence >= 50 ? 'Medium' : 'Low'}
                    </span>
                  )}
                </div>
              )}

              <div className="flex-1 overflow-y-auto max-h-[340px] pr-1">
                {transcription ? (
                  <div className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {transcription}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-16">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900/60 rounded-full flex items-center justify-center text-slate-300">
                      <Volume2 className="w-8 h-8 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">Waiting for input</p>
                      <p className="text-slate-400 text-xs max-w-[220px]">
                        Record live voice or upload an audio track above.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Downloads Footer */}
              {transcription && (
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-3">
                  <button
                    onClick={downloadTXT}
                    className="py-2.5 px-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-800 font-bold text-xs rounded-xl transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download TXT
                  </button>
                  <button
                    onClick={downloadPDF}
                    className="py-2.5 px-4 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: Info */}
        <div className="w-full lg:w-[360px] space-y-8">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-xl space-y-8">
            <div className="space-y-6">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Features</h4>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80">
                  <Mic className="w-5 h-5 text-blue-500 animate-pulse" />
                  <div className="space-y-0.5">
                    <span className="block text-sm font-bold text-slate-700 dark:text-slate-300">Live Recording</span>
                    <span className="block text-[11px] text-slate-400">Capture microphone with pause controls</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <div className="space-y-0.5">
                    <span className="block text-sm font-bold text-slate-700 dark:text-slate-300">High Fidelity</span>
                    <span className="block text-[11px] text-slate-400">Verbatim transcripts & punctuation</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <div className="space-y-0.5">
                    <span className="block text-sm font-bold text-slate-700 dark:text-slate-300">Multilingual</span>
                    <span className="block text-[11px] text-slate-400">Supports English, Hindi, Spanish & more</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <p className="text-xs text-primary font-bold leading-relaxed">
                  Powered by advanced Google Gemini 3.5 Flash, delivering fast, highly-accurate conversions with automatic language classification.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
