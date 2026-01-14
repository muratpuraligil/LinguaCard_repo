
import React, { useState } from 'react';
import { Word } from '../types';
import { ArrowLeft, RotateCcw, Search, Trash2, Ghost } from 'lucide-react';

interface ArchiveViewProps {
  words: Word[];
  onExit: () => void;
  onRestore: (id: string) => void;
}

const ArchiveView: React.FC<ArchiveViewProps> = ({ words, onExit, onRestore }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = words.filter(w => 
    w.english.toLowerCase().includes(searchTerm.toLowerCase()) || 
    w.turkish.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10 font-['Plus_Jakarta_Sans'] flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <div className="flex items-center gap-6 mb-12">
            <button onClick={onExit} className="p-4 bg-zinc-900 rounded-2xl hover:bg-zinc-800 transition-all border border-white/5">
                <ArrowLeft size={24} className="text-slate-400" />
            </button>
            <div>
                <h1 className="text-4xl font-black mb-1">Kelime Arşivi</h1>
                <p className="text-slate-500 font-bold">Öğrendiğin ve rafa kaldırdığın kelimeler burada.</p>
            </div>
        </div>

        <div className="relative mb-10 group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Arşivde ara..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-6 py-5 bg-zinc-900 border border-white/5 rounded-3xl focus:outline-none focus:border-blue-500/50 transition-all text-white font-bold placeholder:text-slate-600"
          />
        </div>

        {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                <Ghost size={64} strokeWidth={1} className="mb-4 opacity-20" />
                <p className="font-black uppercase tracking-widest text-xs">Arşivde kelime bulunamadı</p>
            </div>
        ) : (
            <div className="space-y-3">
                {filtered.map((word, index) => (
                    <div key={word.id} className="group bg-zinc-900/50 hover:bg-zinc-900 p-5 rounded-2xl border border-white/5 flex items-center justify-between transition-all">
                        <div className="flex items-center gap-4">
                            <span className="text-slate-700 font-black text-xs w-6">{index + 1}.</span>
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-black text-white">{word.english}</span>
                                <span className="text-slate-600 font-bold">/</span>
                                <span className="text-lg font-bold text-slate-400">{word.turkish}</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => onRestore(word.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-xl hover:bg-blue-600 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest"
                            >
                                <RotateCcw size={14} />
                                Listeye Ekle
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default ArchiveView;
