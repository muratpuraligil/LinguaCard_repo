
import React, { useState, useEffect, useCallback } from 'react';
import { Image as ImageIcon, X, Keyboard, Sparkles, RotateCcw, Clock } from 'lucide-react';
import { PulseLoader } from './Loader';

interface UploadModalProps {
  onClose: () => void;
  onFileSelect: (file: File) => void;
  isLoading: boolean;
  showToast?: (message: string, type: 'success' | 'error' | 'warning') => void;
}

const COOLDOWN_MS = 10_000; 

const UploadModal: React.FC<UploadModalProps> = ({ onClose, onFileSelect, isLoading, showToast }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = useCallback((file: File) => {
    if (isLoading) return;
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, [isLoading]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isLoading) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) handleFileChange(file);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => {
        window.removeEventListener('paste', handlePaste);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [handleFileChange, isLoading, previewUrl]);

  const startAnalysis = () => {
      if (!selectedFile || isLoading) return;

      const lastCall = localStorage.getItem('lingua_last_ai_call');
      const now = Date.now();
      
      if (lastCall) {
          const timePassed = now - parseInt(lastCall);
          if (timePassed < COOLDOWN_MS) {
              const remaining = Math.ceil((COOLDOWN_MS - timePassed) / 1000);
              showToast?.(`Lütfen ${remaining} saniye sonra tekrar deneyin.`, 'warning');
              return;
          }
      }

      localStorage.setItem('lingua_last_ai_call', now.toString());
      onFileSelect(selectedFile);
  };

  const resetSelection = () => {
      setSelectedFile(null);
      setPreviewUrl(null);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[9999] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#0a0a0a] w-full max-w-lg rounded-[48px] p-10 border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Close Button - Always available unless critical loading */}
        <button 
          onClick={onClose} 
          disabled={isLoading}
          className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-red-500 hover:text-white text-slate-400 rounded-full transition-all active:scale-90 disabled:opacity-0 disabled:pointer-events-none"
        >
            <X size={24} strokeWidth={2.5} />
        </button>

        {!previewUrl ? (
            <>
                <div className="text-center mb-8 mt-4">
                    <div className="text-5xl mb-6 animate-float inline-block">📸</div>
                    <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Görsel Yükle veya Yapıştır</h2>
                    <p className="text-slate-400 text-lg font-medium leading-relaxed">
                        Resim dosyasını seçebilir veya <span className="text-white bg-white/10 px-2 py-0.5 rounded-lg">CTRL+V</span> ile yapıştırabilirsin.
                    </p>
                </div>

                <div className="border-2 border-dashed border-white/10 rounded-[40px] p-8 bg-white/5 flex flex-col items-center gap-6 group hover:border-blue-500/30 transition-all">
                     <label className="cursor-pointer flex flex-col items-center gap-4 p-8 bg-black rounded-[32px] border border-white/5 hover:border-blue-500 transition-all w-full max-w-[220px]">
                         <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                            <ImageIcon size={32} />
                         </div>
                         <span className="text-sm font-black uppercase tracking-widest">Dosya Seç</span>
                         <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*" 
                            onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0])} 
                         />
                     </label>
                     <div className="flex items-center gap-3 text-slate-400 bg-black/40 px-6 py-3 rounded-full border border-white/5">
                        <Keyboard size={18} />
                        <span className="text-xs font-bold">Panodan Yapıştır (CTRL+V)</span>
                     </div>
                </div>
            </>
        ) : (
            <div className={`flex flex-col items-center transition-opacity ${isLoading ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
                <div className="w-full aspect-video bg-black rounded-[32px] border border-white/10 overflow-hidden mb-8 relative">
                    <img src={previewUrl} className="w-full h-full object-contain" alt="Preview" />
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black text-white/70 uppercase tracking-widest flex items-center gap-2">
                        <ImageIcon size={14} /> Önizleme
                    </div>
                </div>

                <div className="flex flex-col gap-4 w-full">
                    <button 
                        onClick={startAnalysis}
                        disabled={isLoading}
                        className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        <Sparkles size={22} />
                        Analizi Başlat
                    </button>
                    
                    <button 
                        onClick={resetSelection}
                        disabled={isLoading}
                        className="w-full py-4 bg-zinc-900 text-slate-400 rounded-2xl font-bold text-sm hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                    >
                        <RotateCcw size={18} />
                        Görseli Değiştir
                    </button>
                </div>
            </div>
        )}

        {isLoading && (
            <div className="absolute inset-0 bg-black/95 rounded-[48px] flex flex-col items-center justify-center z-50 backdrop-blur-md animate-fadeIn">
                <PulseLoader />
                <p className="font-black text-white text-2xl tracking-tight mt-10">Görsel İşleniyor</p>
                <div className="flex items-center gap-2 mt-4 text-blue-400">
                    <Sparkles size={16} className="animate-pulse" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Yapay Zeka Analiz Ediyor</p>
                </div>
                <p className="mt-8 text-slate-500 text-xs font-bold text-center px-12">Lütfen pencereyi kapatmayın, işlem 30 saniye sürebilir.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default UploadModal;
