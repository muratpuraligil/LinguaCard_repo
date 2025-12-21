import React from 'react';
import { Image as ImageIcon, X } from 'lucide-react';

interface UploadModalProps {
  onClose: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
}

const UploadModal: React.FC<UploadModalProps> = ({ onClose, onImageUpload, isLoading }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[9999] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans'] animate-fadeIn">
      <div className="bg-[#0a0a0a] w-full max-w-lg rounded-[48px] p-10 border border-white/10 shadow-2xl relative">
        {/* Close Button - Enhanced visibility and z-index */}
        <button 
            onClick={onClose} 
            className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-red-500 hover:text-white text-slate-400 rounded-full transition-all z-50 active:scale-90"
            aria-label="Kapat"
        >
            <X size={24} strokeWidth={2.5} />
        </button>

        <div className="text-center mb-10 mt-4">
            <div className="text-5xl mb-6 animate-float">📸</div>
            <h2 className="text-3xl font-black text-white mb-4">Fotoğrafı Okut</h2>
            <p className="text-slate-400 text-lg px-2 leading-relaxed font-medium">
                Dilediğinde resmi paylaş , robot kelimeleri listene eklesin ve birlikte çalışalım, Haydi !!!
            </p>
        </div>

        <div className="border-2 border-dashed border-white/10 rounded-[40px] p-10 bg-white/5 flex flex-col items-center justify-center gap-8 group transition-colors relative overflow-hidden hover:bg-white/10">
             
             <div className="w-full flex justify-center">
                 <label className="cursor-pointer flex flex-col items-center gap-6 p-10 bg-black rounded-[32px] border border-white/5 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/20 transition-all w-full max-w-[200px] group-hover:scale-105">
                     <div className="w-20 h-20 bg-blue-500/10 text-blue-500 rounded-3xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                        <ImageIcon size={40} />
                     </div>
                     <div className="text-center">
                        <span className="block text-sm font-black text-white uppercase tracking-widest mb-1">Galeri</span>
                        <span className="text-[10px] font-bold text-slate-500">JPG veya PNG</span>
                     </div>
                     <input type="file" className="hidden" accept="image/*" onChange={onImageUpload} disabled={isLoading} />
                 </label>
             </div>
        </div>

        {isLoading && (
            <div className="absolute inset-0 bg-black/95 rounded-[48px] flex flex-col items-center justify-center z-50 backdrop-blur-md">
                <div className="w-20 h-20 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-6"></div>
                <p className="font-black text-white text-2xl tracking-tight">Yapay Zeka Okuyor</p>
                <p className="text-blue-400 text-xs mt-3 font-black uppercase tracking-[0.2em]">Kelimeler işleniyor ✨</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default UploadModal;