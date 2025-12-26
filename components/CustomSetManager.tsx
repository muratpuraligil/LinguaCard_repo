import React, { useState, useMemo, useEffect } from 'react';
import { Word } from '../types';
import { ArrowLeft, Plus, Play, Layers, Image, CheckCircle2, CircleDashed, RotateCcw, Trophy, Loader2 } from 'lucide-react';

interface CustomSetManagerProps {
  words: Word[];
  onExit: () => void;
  onPlaySet: (setWords: Word[]) => void;
  onUploadNewSet: (setName: string) => void;
}

type SetStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

const CustomSetManager: React.FC<CustomSetManagerProps> = ({ words, onExit, onPlaySet, onUploadNewSet }) => {
  const [showInput, setShowInput] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  
  // State yenilemesini tetiklemek için basit bir sayaç
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setTick(prev => prev + 1);
  }, []);

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

  const getSetProgress = (setName: string, totalCount: number) => {
    try {
        const storageKey = `lingua_set_progress_${setName.replace(/\s+/g, '_')}`;
        const saved = localStorage.getItem(storageKey);
        
        if (!saved) return { completed: 0, percent: 0, status: 'NOT_STARTED' as SetStatus };

        const progressData = JSON.parse(saved);
        const completedCount = Object.values(progressData).filter((p: any) => p?.status === 'CORRECT').length;
        
        let status: SetStatus = 'NOT_STARTED';
        if (completedCount === 0) status = 'NOT_STARTED';
        else if (completedCount >= totalCount) status = 'COMPLETED';
        else status = 'IN_PROGRESS';

        return {
            completed: completedCount,
            percent: Math.round((completedCount / totalCount) * 100),
            status
        };
    } catch (e) {
        return { completed: 0, percent: 0, status: 'NOT_STARTED' as SetStatus };
    }
  };

  // Metin uzunluğuna göre font boyutu belirleme yardımcıları
  const getTitleClass = (text: string) => {
      const len = text.length;
      if (len < 15) return "text-4xl";
      if (len < 25) return "text-3xl";
      if (len < 40) return "text-2xl";
      return "text-xl";
  };

  const getDescriptionClass = (text: string) => {
      const len = text.length;
      if (len < 50) return "text-lg";
      if (len < 100) return "text-base";
      return "text-sm";
  };

  return (
    <div className="min-h-screen bg-black text-white font-['Plus_Jakarta_Sans'] p-6 md:p-10 flex flex-col items-center">
      <div className="w-full max-w-[1600px]">
        {/* Header */}
        <div className="flex items-center gap-6 mb-12">
            <button onClick={onExit} className="p-4 bg-zinc-900 rounded-2xl hover:bg-zinc-800 transition-all border border-white/5 group shadow-lg">
                <ArrowLeft size={24} className="text-slate-400 group-hover:text-white transition-colors" />
            </button>
            <div>
                <h1 className="text-4xl font-black mb-2 tracking-tight">Özel Cümle Setleri</h1>
                <p className="text-slate-500 font-bold text-lg">Kendi oluşturduğun setlerle alıştırma yap.</p>
            </div>
        </div>

        {/* Grid Container: justify-center ile kartları ortalıyoruz */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 justify-center items-start">
            
            {/* 1. KART: YENİ SET OLUŞTUR (Dashboard Stili) */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[40px] p-1 flex flex-col relative overflow-hidden group h-[450px] shadow-2xl shadow-blue-900/20 hover:scale-[1.02] transition-transform duration-300">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                
                <div className="bg-black/20 backdrop-blur-sm w-full h-full rounded-[36px] p-8 flex flex-col items-center justify-center relative z-10 text-center">
                    {!showInput ? (
                        <div className="flex flex-col items-center justify-center w-full h-full">
                          <div 
                              onClick={() => setShowInput(true)}
                              className="w-24 h-24 bg-white text-blue-600 rounded-[32px] flex items-center justify-center mb-8 shadow-xl cursor-pointer group-hover:rotate-90 transition-transform duration-500"
                          >
                              <Plus size={48} strokeWidth={4} />
                          </div>
                          <h3 className="text-3xl font-black text-white mb-2">Yeni Set</h3>
                          <p className="text-blue-100 text-base font-bold mb-10 opacity-80 px-4">Görselden cümle seti üret</p>
                          <button 
                              onClick={() => setShowInput(true)}
                              className="w-full py-5 bg-white text-blue-900 rounded-2xl font-black hover:bg-blue-50 transition-all active:scale-95 shadow-lg text-lg"
                          >
                              Başla
                          </button>
                        </div>
                    ) : (
                        <div className="w-full animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                            <div className="w-16 h-16 bg-white/20 text-white rounded-2xl flex items-center justify-center mb-6 mx-auto backdrop-blur-md">
                                <Image size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-6">Setine İsim Ver</h3>
                            <input 
                              autoFocus
                              value={newSetName}
                              onChange={(e) => setNewSetName(e.target.value)}
                              placeholder="Örn: Tatil Modu"
                              className="w-full bg-black/40 border border-white/20 rounded-2xl p-5 text-center font-bold text-white placeholder:text-white/40 mb-6 focus:outline-none focus:border-white focus:bg-black/60 transition-all text-lg"
                              onKeyDown={(e) => e.key === 'Enter' && handleCreateClick()}
                            />
                            <div className="flex gap-3">
                                <button onClick={() => setShowInput(false)} className="flex-1 py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-white transition-colors">İptal</button>
                                <button onClick={handleCreateClick} className="flex-1 py-4 bg-white text-blue-900 hover:bg-blue-50 rounded-2xl font-bold shadow-lg">Oluştur</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MEVCUT SETLER LİSTESİ */}
            {setNames.map(name => {
                const totalWords = sets[name].length;
                const { completed, percent, status } = getSetProgress(name, totalWords);
                const description = sets[name][0]?.example_sentence || "Açıklama yok";

                // Statü Konfigürasyonu (Dashboard renkleri ile uyumlu ve daha büyük)
                let statusConfig = {
                    color: "text-slate-400",
                    bgColor: "bg-zinc-800",
                    borderColor: "border-slate-600",
                    bottomBorder: "border-slate-600",
                    icon: <CircleDashed size={20} strokeWidth={2.5} />,
                    label: "Başlanmadı",
                    btnText: "Çalışmaya Başla",
                    btnIcon: <Play size={24} fill="currentColor" />,
                    progressColor: "bg-slate-700",
                    animationClass: ""
                };

                if (status === 'IN_PROGRESS') {
                    statusConfig = {
                        color: "text-blue-400",
                        bgColor: "bg-blue-900/20",
                        borderColor: "border-blue-500/30",
                        bottomBorder: "border-blue-500",
                        icon: <Loader2 size={20} strokeWidth={2.5} className="animate-spin" />, // İkon dönüyor
                        label: "Devam Ediyor",
                        btnText: "Devam Et",
                        btnIcon: <Play size={24} fill="currentColor" />,
                        progressColor: "bg-blue-500",
                        animationClass: "animate-pulse" // Badge yanıp sönüyor
                    };
                } else if (status === 'COMPLETED') {
                    statusConfig = {
                        color: "text-emerald-400",
                        bgColor: "bg-emerald-900/20",
                        borderColor: "border-emerald-500/30",
                        bottomBorder: "border-emerald-500",
                        icon: <CheckCircle2 size={20} strokeWidth={2.5} />,
                        label: "Tamamlandı",
                        btnText: "Tekrar Et",
                        btnIcon: <RotateCcw size={24} />,
                        progressColor: "bg-emerald-500",
                        animationClass: ""
                    };
                }

                return (
                    <div key={name} className={`bg-zinc-900 border-b-4 ${statusConfig.bottomBorder} rounded-[40px] p-8 flex flex-col justify-between group transition-all relative overflow-hidden h-[450px] hover:bg-zinc-800 shadow-xl`}>
                        
                        {/* Top Bar: Status Badge (BÜYÜTÜLDÜ) */}
                        <div className="flex justify-between items-center mb-6 h-10 flex-shrink-0">
                            <div className={`flex items-center gap-3 px-5 py-2.5 rounded-full text-sm font-black uppercase tracking-widest ${statusConfig.bgColor} ${statusConfig.color} border ${statusConfig.borderColor} ${statusConfig.animationClass}`}>
                                {statusConfig.icon}
                                <span>{statusConfig.label}</span>
                            </div>
                            {status === 'COMPLETED' && <Trophy className="text-yellow-500 animate-pulse" size={28} />}
                        </div>

                        {/* Content - Flex-1 to take available space but bounded. CENTERED CONTENT */}
                        <div className="mb-4 flex-1 overflow-hidden flex flex-col items-center justify-center text-center px-2">
                            {/* Dinamik Başlık Boyutu */}
                            <h3 className={`${getTitleClass(name)} font-black text-white mb-3 leading-[1.1] group-hover:text-blue-400 transition-colors tracking-tight break-words`}>
                              {name}
                            </h3>
                            
                            {/* Dinamik Açıklama Boyutu */}
                            <p className={`${getDescriptionClass(description)} text-slate-500 font-bold leading-relaxed overflow-hidden text-ellipsis line-clamp-4`}>
                                {description}
                            </p>
                        </div>

                        {/* Progress Bar & Stats - Fixed Height Bottom Section */}
                        <div className="mt-auto h-[120px] flex flex-col justify-end flex-shrink-0">
                            <div className="flex justify-between items-end mb-3">
                                <span className="text-4xl font-black text-white tracking-tighter">{completed}<span className="text-xl text-slate-600 font-bold">/{totalWords}</span></span>
                                <span className={`text-lg font-black ${statusConfig.color}`}>{percent}%</span>
                            </div>
                            
                            <div className="w-full h-3 bg-black rounded-full overflow-hidden mb-6 border border-white/5">
                                <div className={`h-full ${statusConfig.progressColor} transition-all duration-1000`} style={{ width: `${percent}%` }}></div>
                            </div>

                            <button 
                              onClick={() => onPlaySet(sets[name])}
                              className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all active:scale-95 text-lg shadow-2xl
                                  ${status === 'COMPLETED' 
                                      ? 'bg-zinc-950 text-white hover:bg-zinc-900 border border-white/10' 
                                      : 'bg-white text-black hover:bg-blue-50'}
                              `}
                            >
                                {statusConfig.btnIcon}
                                {statusConfig.btnText}
                            </button>
                        </div>
                    </div>
                );
            })}

            {setNames.length === 0 && !showInput && (
                <div className="col-span-full flex flex-col items-center justify-center p-12 text-center opacity-40">
                    <Layers size={64} className="text-slate-600 mb-6" />
                    <h3 className="text-2xl font-bold text-white mb-2">Henüz hiç setin yok.</h3>
                    <p className="text-slate-500 text-lg">Yeni bir set oluşturarak başla.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default CustomSetManager;