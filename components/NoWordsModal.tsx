import React from 'react';
import { Image, Plus, X, Layers } from 'lucide-react';

interface NoWordsModalProps {
  onClose: () => void;
  onOpenUpload: () => void;
  onQuickAdd: () => void;
}

const NoWordsModal: React.FC<NoWordsModalProps> = ({ onClose, onOpenUpload, onQuickAdd }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans'] animate-fadeIn">
      <div className="bg-[#0a0a0a] w-full max-w-md rounded-[40px] p-8 border border-white/10 shadow-2xl relative">
        
        {/* Close Button */}
        <button 
            onClick={onClose} 
            className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-red-500 hover:text-white text-slate-400 rounded-full transition-all z-50 active:scale-90"
        >
            <X size={20} strokeWidth={2.5} />
        </button>

        <div className="text-center mb-8 mt-4">
            <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Layers size={40} className="text-yellow-500 animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-white mb-3">Henüz Kelime Yok</h2>
            <p className="text-slate-400 text-sm font-medium leading-relaxed px-4">
                Alıştırma yapabilmek için kütüphanene kelime eklemelisin. Nasıl başlamak istersin?
            </p>
        </div>

        <div className="flex flex-col gap-4">
             <button 
                onClick={() => { onClose(); onOpenUpload(); }}
                className="w-full p-5 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl flex items-center gap-4 transition-all group active:scale-95 shadow-lg shadow-blue-900/20"
             >
                 <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Image size={24} />
                 </div>
                 <div className="text-left">
                     <span className="block font-black text-lg">Resim ile Yükle</span>
                     <span className="text-blue-200 text-xs font-medium">Yapay zeka görseli okusun</span>
                 </div>
             </button>

             <button 
                onClick={() => { onClose(); onQuickAdd(); }}
                className="w-full p-5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-3xl flex items-center gap-4 transition-all group active:scale-95 border border-white/5"
             >
                 <div className="w-12 h-12 bg-zinc-700 group-hover:bg-zinc-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus size={24} />
                 </div>
                 <div className="text-left">
                     <span className="block font-black text-lg">Hızlı Ekle</span>
                     <span className="text-slate-400 text-xs font-medium">Elle kelime girişi yap</span>
                 </div>
             </button>
        </div>
      </div>
    </div>
  );
};

export default NoWordsModal;