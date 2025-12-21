import React, { useState, useMemo } from 'react';
import { Word } from '../types';
import { ArrowLeft, Plus, Play, Layers, Image, Sparkles } from 'lucide-react';

interface CustomSetManagerProps {
  words: Word[];
  onExit: () => void;
  onPlaySet: (setWords: Word[]) => void;
  onUploadNewSet: (setName: string) => void;
}

const CustomSetManager: React.FC<CustomSetManagerProps> = ({ words, onExit, onPlaySet, onUploadNewSet }) => {
  const [showInput, setShowInput] = useState(false);
  const [newSetName, setNewSetName] = useState('');

  // Sadece set ismi olan kelimeleri grupla
  const sets = useMemo(() => {
    const grouped: Record<string, Word[]> = {};
    words.forEach(w => {
        if (w.set_name) {
            if (!grouped[w.set_name]) grouped[w.set_name] = [];
            grouped[w.set_name].push(w);
        }
    });
    return grouped;
  }, [words]);

  const setNames = Object.keys(sets).sort();

  const handleCreateClick = () => {
      if (!newSetName.trim()) return;
      onUploadNewSet(newSetName.trim());
      setNewSetName('');
      setShowInput(false);
  };

  return (
    <div className="min-h-screen bg-black text-white font-['Plus_Jakarta_Sans'] p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10 max-w-5xl mx-auto">
          <button onClick={onExit} className="p-4 bg-zinc-900 rounded-2xl hover:bg-zinc-800 transition-all">
              <ArrowLeft size={24} className="text-slate-400" />
          </button>
          <div>
              <h1 className="text-3xl font-black">Özel Cümle Setleri</h1>
              <p className="text-slate-500 font-medium">Kendi oluşturduğun setlerle çalış.</p>
          </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create New Set Card */}
          <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border border-blue-500/30 rounded-[40px] p-8 flex flex-col justify-center items-center text-center relative overflow-hidden group min-h-[320px]">
              <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-all pointer-events-none"></div>
              
              <div className="relative z-10 w-full flex flex-col items-center justify-center h-full">
                  {!showInput ? (
                      <div className="flex flex-col items-center justify-center w-full h-full py-4">
                        <div 
                            onClick={() => setShowInput(true)}
                            className="w-24 h-24 bg-blue-500 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform cursor-pointer"
                        >
                            <Plus size={40} className="text-white" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2 pointer-events-none">Yeni Set Oluştur</h3>
                        <p className="text-blue-200/60 text-sm font-medium mb-8 pointer-events-none">Resim yükleyerek yeni bir cümle seti ekle.</p>
                        <button 
                            onClick={() => setShowInput(true)}
                            className="w-full py-4 bg-white text-blue-900 rounded-2xl font-black hover:bg-blue-50 transition-all active:scale-95 shadow-xl cursor-pointer"
                        >
                            Başla
                        </button>
                      </div>
                  ) : (
                      <div className="w-full animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                          <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                              <Image size={32} />
                          </div>
                          <h3 className="text-xl font-black text-white mb-4">Setine İsim Ver</h3>
                          <input 
                            autoFocus
                            value={newSetName}
                            onChange={(e) => setNewSetName(e.target.value)}
                            placeholder="Örn: Tatil Cümleleri"
                            className="w-full bg-black/50 border border-blue-500/30 rounded-xl p-4 text-center font-bold text-white placeholder:text-white/20 mb-4 focus:outline-none focus:border-blue-500"
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateClick()}
                          />
                          <div className="flex gap-2">
                              <button onClick={() => setShowInput(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm text-slate-300">İptal</button>
                              <button onClick={handleCreateClick} className="flex-1 py-3 bg-blue-500 hover:bg-blue-400 rounded-xl font-bold text-sm text-white shadow-lg shadow-blue-900/20">Resim Seç</button>
                          </div>
                      </div>
                  )}
              </div>
          </div>

          {/* Existing Sets */}
          {setNames.map(name => (
              <div key={name} className="bg-zinc-900 border border-white/5 rounded-[40px] p-8 flex flex-col justify-between group hover:border-zinc-700 transition-all min-h-[320px]">
                  <div>
                      <div className="flex justify-between items-start mb-6">
                          <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
                              <Layers size={28} />
                          </div>
                          <span className="bg-zinc-800 text-slate-400 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest">
                              {sets[name].length} Cümle
                          </span>
                      </div>
                      <h3 className="text-2xl font-black text-white mb-2 line-clamp-2">{name}</h3>
                      <p className="text-slate-500 text-sm font-medium">
                          {sets[name][0]?.example_sentence?.substring(0, 40)}...
                      </p>
                  </div>
                  
                  <button 
                    onClick={() => onPlaySet(sets[name])}
                    className="mt-8 w-full py-4 bg-zinc-800 hover:bg-emerald-600 hover:text-white text-emerald-500 rounded-2xl font-black flex items-center justify-center gap-3 transition-all active:scale-95 group-hover:shadow-xl group-hover:shadow-emerald-900/20"
                  >
                      <Play size={20} fill="currentColor" />
                      Çalışmaya Başla
                  </button>
              </div>
          ))}

          {setNames.length === 0 && !showInput && (
              <div className="col-span-full md:col-span-1 lg:col-span-2 flex flex-col items-center justify-center p-8 text-center opacity-50 min-h-[320px]">
                  <Sparkles size={48} className="text-slate-600 mb-4" />
                  <p className="text-slate-500 font-bold">Henüz hiç özel setin yok.</p>
              </div>
          )}
      </div>
    </div>
  );
};

export default CustomSetManager;