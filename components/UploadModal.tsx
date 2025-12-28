
import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, X, Keyboard, Key, AlertCircle, ExternalLink, Sparkles, PlusCircle, ShieldCheck, Clock, HelpCircle } from 'lucide-react';
import { OriginalPulseLoader } from '../App';

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
        if (!hasKey || isKeyInvalid) {
          setNeedsKey(true);
        }
      } else if (!process.env.API_KEY || isKeyInvalid) {
        setNeedsKey(true);
      }
    };
    checkKey();
  }, [isKeyInvalid]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (needsKey || isLoading) return;
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
  }, [onFileSelect, needsKey, isLoading]);

  const handleOpenKeyDialog = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      try {
        await aistudio.openSelectKey();
        setNeedsKey(false);
      } catch (err) {
        console.error("Key selection failed", err);
      }
    }
  };

  const handleGoToManual = () => {
      onClose();
      setTimeout(() => {
          const btn = document.getElementById('quick-add-btn');
          if (btn) btn.click();
      }, 100);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[9999] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#0a0a0a] w-full max-w-lg rounded-[48px] p-10 border border-white/10 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-red-500 hover:text-white text-slate-400 rounded-full transition-all active:scale-90">
            <X size={24} strokeWidth={2.5} />
        </button>

        {needsKey ? (
            <div className="text-center py-4 animate-fadeIn">
                <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Key size={40} className="text-blue-500" />
                </div>
                <h2 className="text-2xl font-black text-white mb-4">Ücretsiz AI Özelliklerini Aç</h2>
                
                <div className="bg-zinc-900/50 border border-white/5 rounded-[32px] p-6 mb-8 text-left">
                    <p className="text-slate-400 text-sm leading-relaxed mb-4">
                        Görsel analizi için Google AI Studio anahtarınızı seçmelisiniz. Bu işlem <span className="text-blue-400 font-bold">ücretsizdir.</span>
                    </p>
                    
                    <div className="space-y-3 mb-6">
                        <div className="flex items-start gap-3 text-slate-400">
                            <ShieldCheck size={18} className="flex-shrink-0 mt-0.5 text-blue-500" />
                            <p className="text-[11px] font-bold leading-tight">
                                Açılacak pencerede "Paid Project" (Ücretli Proje) uyarısı alırsanız; Google Cloud panelinden projenize bir faturalandırma hesabı bağlamanız gerekir. Ücretsiz kota içinde kaldığınız sürece kartınızdan harcama yapılmaz.
                            </p>
                        </div>
                        <div className="flex items-start gap-3 text-emerald-500/80">
                            <Sparkles size={18} className="flex-shrink-0 mt-0.5" />
                            <p className="text-[11px] font-bold leading-tight">
                                <span className="text-white">Gemini 3 Flash</span> modeli ile günlük ücretsiz kullanım hakkınız devam eder.
                            </p>
                        </div>
                        <div className="flex items-start gap-3 text-amber-500/80 bg-amber-500/5 p-3 rounded-2xl border border-amber-500/10">
                            <HelpCircle size={18} className="flex-shrink-0 mt-0.5" />
                            <p className="text-[10px] font-bold leading-tight italic">
                                "No Paid Project" hatası Google'ın kimlik doğrulama şartıdır. Eğer listeniz boş görünüyorsa, faturalandırma hesabı bağlı bir proje seçtiğinizden emin olun.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 text-slate-500 pt-2 border-t border-white/5">
                        <Clock size={16} className="flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] font-bold leading-tight italic">
                            Not: Günlük kotalar her gece yarısı otomatik olarak sıfırlanır.
                        </p>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <button 
                        onClick={handleOpenKeyDialog}
                        className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                        <Key size={20} />
                        Güvenli Bağlantıyı Başlat
                    </button>
                    
                    <button 
                        onClick={handleGoToManual}
                        className="w-full py-5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-black text-lg border border-white/5 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                        <PlusCircle size={20} />
                        Anahtar Olmadan Devam Et
                    </button>
                </div>

                <div className="mt-8">
                    <a 
                        href="https://ai.google.dev/gemini-api/docs/billing" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                        Google Ücretsiz Kullanım Politikası <ExternalLink size={10} />
                    </a>
                </div>
            </div>
        ) : (
            <>
                <div className="text-center mb-8 mt-4">
                    <div className="text-5xl mb-6 animate-float inline-block">📸</div>
                    <h2 className="text-3xl font-black text-white mb-4">Görsel Yükle veya Yapıştır</h2>
                    <p className="text-slate-400 text-lg font-medium leading-relaxed">Resim dosyasını seçebilir veya <span className="text-white bg-white/10 px-2 py-0.5 rounded-lg">CTRL+V</span> ile yapıştırabilirsin.</p>
                </div>
                <div className="border-2 border-dashed border-white/10 rounded-[40px] p-8 bg-white/5 flex flex-col items-center gap-6 group hover:border-blue-500/30 transition-all">
                     <label className="cursor-pointer flex flex-col items-center gap-4 p-8 bg-black rounded-[32px] border border-white/5 hover:border-blue-500 transition-all w-full max-w-[220px]">
                         <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all"><ImageIcon size={32} /></div>
                         <span className="text-sm font-black uppercase tracking-widest">Dosya Seç</span>
                         <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && onFileSelect(e.target.files[0])} disabled={isLoading} />
                     </label>
                     <div className="flex items-center gap-3 text-slate-400 bg-black/40 px-6 py-3 rounded-full border border-white/5">
                        <Keyboard size={18} />
                        <span className="text-xs font-bold">Panodan Yapıştır (CTRL+V)</span>
                     </div>
                </div>
            </>
        )}

        {isLoading && (
            <div className="absolute inset-0 bg-black/95 rounded-[48px] flex flex-col items-center justify-center z-50 backdrop-blur-md animate-fadeIn">
                <OriginalPulseLoader />
                <p className="font-black text-white text-2xl tracking-tight mt-10">Görsel İşleniyor</p>
                <div className="flex items-center gap-2 mt-4 text-blue-400">
                    <Sparkles size={16} className="animate-pulse" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Yapay Zeka Analiz Ediyor</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default UploadModal;
