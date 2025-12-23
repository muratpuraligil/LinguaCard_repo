import React from 'react';
import { X, Sparkles, Layers } from 'lucide-react';

interface SentenceModeSelectionModalProps {
  onClose: () => void;
  onSelectStandard: () => void;
  onSelectCustom: () => void;
}

const SentenceModeSelectionModal: React.FC<SentenceModeSelectionModalProps> = ({ 
  onClose, 
  onSelectStandard, 
  onSelectCustom 
}) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans'] animate-fadeIn">
      {/* Modal genişliği max-w-3xl yapıldı, padding artırıldı */}
      <div className="bg-[#0a0a0a] w-full max-w-3xl rounded-[56px] p-10 md:p-14 border border-white/10 shadow-2xl relative">
        
        <button 
            onClick={onClose} 
            className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-red-500 hover:text-white text-slate-400 rounded-full transition-all z-50 active:scale-90"
        >
            <X size={24} strokeWidth={3} />
        </button>

        <div className="text-center mb-12 mt-2">
            {/* Başlık ve açıklama büyütüldü */}
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">Cümle Çalışma Modunu Seç</h2>
            <p className="text-slate-400 font-bold text-xl">Nasıl pratik yapmak istersin?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Buton paddingleri ve içerik boyutları artırıldı */}
             <button 
                onClick={onSelectStandard}
                className="p-10 bg-purple-600/10 hover:bg-purple-600 hover:text-white text-purple-400 rounded-[40px] flex flex-col items-center gap-6 transition-all group active:scale-95 border border-purple-500/20"
             >
                 <div className="w-24 h-24 bg-purple-500/20 rounded-3xl flex items-center justify-center group-hover:bg-white/20 transition-all">
                    <Sparkles size={48} strokeWidth={2} />
                 </div>
                 <div className="text-center">
                     <span className="block font-black text-2xl mb-2">Kelimelerimden Üret</span>
                     <span className="text-base font-bold opacity-70">Mevcut listeni kullan</span>
                 </div>
             </button>

             <button 
                onClick={onSelectCustom}
                className="p-10 bg-blue-600/10 hover:bg-blue-600 hover:text-white text-blue-400 rounded-[40px] flex flex-col items-center gap-6 transition-all group active:scale-95 border border-blue-500/20"
             >
                 <div className="w-24 h-24 bg-blue-500/20 rounded-3xl flex items-center justify-center group-hover:bg-white/20 transition-all">
                    <Layers size={48} strokeWidth={2} />
                 </div>
                 <div className="text-center">
                     <span className="block font-black text-2xl mb-2">Özel Cümle Setleri</span>
                     <span className="text-base font-bold opacity-70">Resimden set oluştur</span>
                 </div>
             </button>
        </div>
      </div>
    </div>
  );
};

export default SentenceModeSelectionModal;