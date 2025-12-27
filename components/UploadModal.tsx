import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, X, Keyboard, Key, AlertCircle, ExternalLink } from 'lucide-react';

interface UploadModalProps {
  onClose: () => void;
  onFileSelect: (file: File) => void;
  isLoading: boolean;
  isKeyInvalid?: boolean;
}

const UploadModal: React.FC<UploadModalProps> = ({ onClose, onFileSelect, isLoading, isKeyInvalid }) => {
  const [needsKey, setNeedsKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        // process.env.API_KEY de boşsa ve aistudio key de yoksa butonu göster
        // Veya dışarıdan "anahtar geçersiz" bilgisi geldiyse butonu göster
        if ((!hasKey && !process.env.API_KEY) || isKeyInvalid) {
          setNeedsKey(true);
        }
      }
    };
    checkKey();
  }, [isKeyInvalid]);

  const handleOpenKeyDialog = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
      // Anahtar seçimi tetiklendikten sonra seçim başarılı varsayılır
      setNeedsKey(false); 
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (needsKey) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) onFileSelect(file);
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onFileSelect, needsKey]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[9999] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans'] animate-fadeIn">
      <div className="bg-[#0a0a0a] w-full max-w-lg rounded-[48px] p-10 border border-white/10 shadow-2xl relative transition-all">
        <button 
            onClick={onClose} 
            className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-red-500 hover:text-white text-slate-400 rounded-full transition-all z-50 active:scale-90"
        >
            <X size={24} strokeWidth={2.5} />
        </button>

        {needsKey ? (
            <div className="text-center py-6 animate-fadeIn">
                <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
                    <Key size={40} className="text-amber-500" />
                </div>
                <h2 className="text-3xl font-black text-white mb-4">
                    {isKeyInvalid ? 'Anahtar Hatası' : 'API Anahtarı Gerekli'}
                </h2>
                <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                    {isKeyInvalid 
                        ? 'Seçili API anahtarı yetkisiz veya geçersiz görünüyor. Lütfen farklı bir anahtar seçin.'
                        : 'Yapay zeka özelliklerini kullanabilmek için bir API anahtarı seçmelisiniz.'}
                </p>
                
                <div className="space-y-4">
                    <button 
                        onClick={handleOpenKeyDialog}
                        className="w-full py-5 bg-amber-500 hover:bg-amber-400 text-black rounded-2xl font-black text-lg shadow-xl shadow-amber-900/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                        <Key size={20} />
                        {isKeyInvalid ? 'Anahtarı Güncelle' : 'API Anahtarı Seç'}
                    </button>
                    
                    <a 
                        href="https://ai.google.dev/gemini-api/docs/billing" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 text-slate-500 hover:text-white transition-colors text-sm font-bold"
                    >
                        Ücretlendirme ve Faturalandırma Bilgisi <ExternalLink size={14} />
                    </a>
                </div>
                
                <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-start gap-3 text-left">
                    <AlertCircle className="text-blue-400 shrink-0 mt-0.5" size={18} />
                    <p className="text-xs text-blue-200 leading-relaxed font-medium">
                        Not: Ücretli (Paid) bir GCP projesinden anahtar seçmeniz önerilir.
                    </p>
                </div>
            </div>
        ) : (
            <>
                <div className="text-center mb-8 mt-4">
                    <div className="text-5xl mb-6 animate-float inline-block">📸</div>
                    <h2 className="text-3xl font-black text-white mb-4">Görsel Yükle veya Yapıştır</h2>
                    <p className="text-slate-400 text-lg px-2 leading-relaxed font-medium">
                        Resim dosyasını seçebilir veya ekran alıntısını direkt olarak <span className="text-white bg-white/10 px-2 py-0.5 rounded-lg border border-white/10 font-bold">CTRL+V</span> ile yapıştırabilirsin.
                    </p>
                </div>

                <div className="border-2 border-dashed border-white/10 rounded-[40px] p-8 bg-white/5 flex flex-col items-center justify-center gap-6 group transition-all relative overflow-hidden hover:bg-white/10 hover:border-blue-500/30">
                     <div className="w-full flex justify-center">
                         <label className="cursor-pointer flex flex-col items-center gap-4 p-8 bg-black rounded-[32px] border border-white/5 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/20 transition-all w-full max-w-[220px] group-hover:scale-105">
                             <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                                <ImageIcon size={32} />
                             </div>
                             <div className="text-center">
                                <span className="block text-sm font-black text-white uppercase tracking-widest mb-1">Dosya Seç</span>
                                <span className="text-[10px] font-bold text-slate-500">JPG, PNG</span>
                             </div>
                             <input type="file" className="hidden" accept="image/*" onChange={handleInputChange} disabled={isLoading} />
                         </label>
                     </div>

                     <div className="flex items-center gap-4 w-full opacity-50">
                        <div className="h-px bg-white/20 flex-1"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">VEYA</span>
                        <div className="h-px bg-white/20 flex-1"></div>
                     </div>

                     <div className="flex items-center gap-3 text-slate-400 bg-black/40 px-6 py-3 rounded-full border border-white/5">
                        <Keyboard size={18} />
                        <span className="text-xs font-bold">Panodan Yapıştır (CTRL+V)</span>
                     </div>
                </div>
            </>
        )}

        {isLoading && (
            <div className="absolute inset-0 bg-black/95 rounded-[48px] flex flex-col items-center justify-center z-50 backdrop-blur-md animate-fadeIn">
                <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-6"></div>
                <p className="font-black text-white text-2xl tracking-tight">Görsel İşleniyor</p>
                <div className="flex items-center gap-2 mt-3 text-blue-400">
                    <SparklesIcon />
                    <p className="text-xs font-black uppercase tracking-[0.2em]">Yapay Zeka Analiz Ediyor</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

const SparklesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-pulse">
    <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="currentColor" />
  </svg>
);

export default UploadModal;