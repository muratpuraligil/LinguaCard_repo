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
      <div className="bg-[#0a0a0a] w-full max-w-lg rounded-[48px] p-8 border border-white/10 shadow-2xl relative">
        
        <button 
            onClick={onClose} 
            className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-red-500 hover:text-white text-slate-400 rounded-full transition-all z-50 active:scale-90"
        >
            <X size={20} strokeWidth={2.5} />
        </button>

        <div className="text-center mb-10 mt-4">
            <h2 className="text-3xl font-black text-white mb-3">Çalışma Modunu Seç</h2>
            <p className="text-slate-400 font-medium">Nasıl pratik yapmak istersin?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <button 
                onClick={onSelectStandard}
                className="p-6 bg-purple-600/10 hover:bg-purple-600 hover:text-white text-purple-400 rounded-[32px] flex flex-col items-center gap-4 transition-all group active:scale-95 border border-purple-500/20"
             >
                 <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-all">
                    <Sparkles size={32} />
                 </div>
                 <div className="text-center">
                     <span className="block font-black text-lg mb-1">Kelimelerimden Üret</span>
                     <span className="text-xs font-bold opacity-70">Mevcut listeni kullan</span>
                 </div>
             </button>

             <button 
                onClick={onSelectCustom}
                className="p-6 bg-blue-600/10 hover:bg-blue-600 hover:text-white text-blue-400 rounded-[32px] flex flex-col items-center gap-4 transition-all group active:scale-95 border border-blue-500/20"
             >
                 <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-all">
                    <Layers size={32} />
                 </div>
                 <div className="text-center">
                     <span className="block font-black text-lg mb-1">Özel Cümle Setleri</span>
                     <span className="text-xs font-bold opacity-70">Resimden set oluştur</span>
                 </div>
             </button>
        </div>
      </div>
    </div>
  );
};

export default SentenceModeSelectionModal;